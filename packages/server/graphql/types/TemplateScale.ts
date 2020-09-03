import {
  GraphQLBoolean,
  GraphQLFloat,
  GraphQLID,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLString
} from 'graphql'
import {GQLContext} from '../graphql'
import {resolveTeam} from '../resolvers'
import GraphQLISO8601Type from './GraphQLISO8601Type'
import PokerTemplate from './PokerTemplate'
import Team from './Team'

const TemplateScale = new GraphQLObjectType<any, GQLContext>({
  name: 'TemplateScale',
  description:
    'A team-specific template scale.',
  fields: () => ({
    id: {
      type: new GraphQLNonNull(GraphQLID),
      description: 'shortid'
    },
    createdAt: {
      type: new GraphQLNonNull(GraphQLISO8601Type)
    },
    isActive: {
      type: GraphQLBoolean,
      description: 'true if the phase item is currently used by the team, else false'
    },
    teamId: {
      type: new GraphQLNonNull(GraphQLID),
      description: 'foreign key. use the team field'
    },
    team: {
      type: Team,
      description: 'The team that owns this reflectPrompt',
      resolve: resolveTeam
    },
    updatedAt: {
      type: new GraphQLNonNull(GraphQLISO8601Type)
    },
    sortOrder: {
      type: new GraphQLNonNull(GraphQLFloat),
      description: 'the order of the items in the template'
    },
    templateId: {
      type: new GraphQLNonNull(GraphQLID),
      description: 'FK for template'
    },
    template: {
      type: new GraphQLNonNull(PokerTemplate),
      description: 'The template that this prompt belongs to',
      resolve: ({templateId}, _args, {dataLoader}) => {
        return dataLoader.get('meetingTemplates').load(templateId)
      }
    },
    name: {
      type: new GraphQLNonNull(GraphQLString),
      description:
        'The title of the phase of the retrospective. Often a short version of the question'
    },
    question: {
      description:
        'The question to answer during the phase of the retrospective (eg What went well?)',
      type: new GraphQLNonNull(GraphQLString)
    },
    description: {
      description:
        'The description to the question for further context. A long version of the question.',
      type: new GraphQLNonNull(GraphQLString),
      resolve: ({description}) => description || ''
    },
    groupColor: {
      description: 'The color used to visually group a phase item.',
      type: new GraphQLNonNull(GraphQLString),
      resolve: ({groupColor}) => groupColor || '#FFFFFF'
    }
  })
})

export default TemplateScale