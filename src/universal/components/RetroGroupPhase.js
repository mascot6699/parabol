/**
 * Renders the UI for the reflection phase of the retrospective meeting
 *
 * @flow
 */
import * as React from 'react'
import {createFragmentContainer} from 'react-relay'
import Button from 'universal/components/Button/Button'
import MeetingPhaseWrapper from 'universal/components/MeetingPhaseWrapper'
import PhaseItemMasonry from 'universal/components/PhaseItemMasonry'
import StyledError from 'universal/components/StyledError'
import withAtmosphere from 'universal/decorators/withAtmosphere/withAtmosphere'
import MeetingControlBar from 'universal/modules/meeting/components/MeetingControlBar/MeetingControlBar'
import AutoGroupReflectionsMutation from 'universal/mutations/AutoGroupReflectionsMutation'
import {VOTE} from 'universal/utils/constants'
import {phaseLabelLookup} from 'universal/utils/meetings/lookups'
import withMutationProps from 'universal/utils/relay/withMutationProps'
import type {MutationProps} from 'universal/utils/relay/withMutationProps'

type Props = {
  atmosphere: Object,
  gotoNext: () => void,
  // flow or relay-compiler is getting really confused here, so I don't use the flow type here
  team: Object,
  ...MutationProps
}

const RetroGroupPhase = (props: Props) => {
  const {atmosphere, error, gotoNext, onError, onCompleted, submitMutation, team} = props
  const {viewerId} = atmosphere
  const {newMeeting} = team
  const {nextAutoGroupThreshold, facilitatorUserId, meetingId} = newMeeting || {}
  const isFacilitating = facilitatorUserId === viewerId
  const nextPhaseLabel = phaseLabelLookup[VOTE]
  const autoGroup = () => {
    submitMutation()
    const groupingThreshold = nextAutoGroupThreshold || 0.5
    AutoGroupReflectionsMutation(atmosphere, {meetingId, groupingThreshold}, onError, onCompleted)
  }
  const canAutoGroup = !nextAutoGroupThreshold || nextAutoGroupThreshold < 1
  return (
    <React.Fragment>
      {error && <StyledError>{error.message}</StyledError>}
      <MeetingPhaseWrapper>
        <PhaseItemMasonry meeting={newMeeting} />
      </MeetingPhaseWrapper>
      {isFacilitating && (
        <MeetingControlBar>
          <Button
            buttonSize='medium'
            buttonStyle='flat'
            colorPalette='dark'
            icon='arrow-circle-right'
            iconLarge
            iconPalette='warm'
            iconPlacement='right'
            label={`Done! Let’s ${nextPhaseLabel}`}
            onClick={gotoNext}
          />
          {canAutoGroup && (
            <Button
              buttonSize='medium'
              buttonStyle='flat'
              colorPalette='dark'
              icon='magic'
              iconLarge
              iconPalette='midGray'
              iconPlacement='left'
              label={'Auto Group'}
              onClick={autoGroup}
            />
          )}
        </MeetingControlBar>
      )}
    </React.Fragment>
  )
}

export default createFragmentContainer(
  withMutationProps(withAtmosphere(RetroGroupPhase)),
  graphql`
    fragment RetroGroupPhase_team on Team {
      newMeeting {
        meetingId: id
        facilitatorUserId
        ...PhaseItemColumn_meeting
        ... on RetrospectiveMeeting {
          ...PhaseItemMasonry_meeting
          nextAutoGroupThreshold
          reflectionGroups {
            id
            meetingId
            sortOrder
            retroPhaseItemId
            reflections {
              id
              retroPhaseItemId
              sortOrder
            }
          }
        }
      }
    }
  `
)
