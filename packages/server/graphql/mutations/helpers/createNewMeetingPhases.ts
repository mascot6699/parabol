import {MeetingTypeEnum} from 'parabol-client/types/graphql'
import {
  AGENDA_ITEMS,
  CHECKIN,
  DISCUSS,
  FIRST_CALL,
  GROUP,
  LAST_CALL,
  REFLECT,
  UPDATES,
  VOTE
} from 'parabol-client/utils/constants'
import getRethink from '../../../database/rethinkDriver'
import AgendaItemsPhase from '../../../database/types/AgendaItemsPhase'
import CheckInPhase from '../../../database/types/CheckInPhase'
import DiscussPhase from '../../../database/types/DiscussPhase'
import EstimatePhase from '../../../database/types/EstimatePhase'
import GenericMeetingPhase from '../../../database/types/GenericMeetingPhase'
import MeetingSettingsPoker from '../../../database/types/MeetingSettingsPoker'
import MeetingSettingsRetrospective from '../../../database/types/MeetingSettingsRetrospective'
import ReflectPhase from '../../../database/types/ReflectPhase'
import UpdatesPhase from '../../../database/types/UpdatesPhase'
import getShuffledArr from '../../../utils/getShuffledArr'
import {DataLoaderWorker} from '../../graphql'

const primePhases = (phases: GenericMeetingPhase[]) => {
  const [firstPhase, secondPhase] = phases
  firstPhase.stages[0].startAt = new Date()
  firstPhase.stages.forEach((stage) => {
    stage.isNavigable = true
    stage.isNavigableByFacilitator = true
  })
  const phaseTwoStageOne = secondPhase.stages[0]
  if (phaseTwoStageOne) {
    phaseTwoStageOne.isNavigableByFacilitator = true
  }
}

const getPastStageDurations = async (teamId: string) => {
  const r = await getRethink()
  return (
    (r
      .table('NewMeeting')
      .getAll(teamId, {index: 'teamId'})
      .filter({isLegacy: false}, {default: true})
      // .orderBy(r.desc('endedAt'))
      .concatMap((row) => row('phases'))
      .concatMap((row) => row('stages'))
      .filter((row) => row.hasFields('startAt', 'endAt'))
      // convert seconds to ms
      .merge((row) => ({
        duration: r
          .sub(row('endAt'), row('startAt'))
          .mul(1000)
          .floor()
      }))
      // remove stages that took under 1 minute
      .filter((row) => row('duration').ge(60000))
      .orderBy(r.desc('startAt'))
      .group('phaseType')
      .ungroup()
      .map((row) => [row('group'), row('reduction')('duration')])
      .coerceTo('object')
      .run() as unknown) as {[key: string]: number[]}
  )
}

const createNewMeetingPhases = async (
  teamId: string,
  meetingCount: number,
  meetingType: MeetingTypeEnum,
  dataLoader: DataLoaderWorker
) => {
  const r = await getRethink()
  const now = new Date()
  const [meetingSettings, stageDurations, teamMembers] = await Promise.all([
    dataLoader.get('meetingSettingsByType').load({teamId, meetingType}) as
      | MeetingSettingsRetrospective
      | MeetingSettingsPoker,
    getPastStageDurations(teamId),
    dataLoader.get('teamMembersByTeamId').load(teamId)
  ])
  const teamMemberIds = getShuffledArr(teamMembers.map(({id}) => id))
  const {phaseTypes, selectedTemplateId} = meetingSettings
  const phases = (await Promise.all(
    phaseTypes.map(async (phaseType) => {
      const durations = stageDurations[phaseType]
      switch (phaseType) {
        case CHECKIN:
          return new CheckInPhase(teamId, meetingCount, teamMemberIds)
        case REFLECT:
          // TODO REMOVE ME AFTER v5.13.0
          await r
            .table('MeetingTemplate')
            .get(selectedTemplateId)
            .update({
              lastUsedAt: now
            })
            .run()
          return new ReflectPhase(teamId, selectedTemplateId, durations)
        case DISCUSS:
          return new DiscussPhase(durations)
        case UPDATES:
          return new UpdatesPhase(teamMemberIds, durations)
        case AGENDA_ITEMS:
          const agendaItems = await dataLoader.get('agendaItemsByTeamId').load(teamId)
          const agendaItemIds = agendaItems.map(({id}) => id)
          return new AgendaItemsPhase(agendaItemIds, durations)
        case 'ESTIMATE':
          return new EstimatePhase()
        case GROUP:
        case VOTE:
        case FIRST_CALL:
        case LAST_CALL:
        case 'SCOPE':
          return new GenericMeetingPhase(phaseType, durations)
        default:
          throw new Error(`Unhandled phaseType: ${phaseType}`)
      }
    })
  )) as GenericMeetingPhase[]
  primePhases(phases)
  return phases
}

export default createNewMeetingPhases
