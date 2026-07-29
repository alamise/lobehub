import AgentGroupsRoutes from './agent-groups.route';
import AgentsRoutes from './agents.route';
import FileRoutes from './files.route';
import KnowledgeBasesRoutes from './knowledge-bases.route';
import MessageTranslationsRoutes from './message-translations.route';
import MessagesRoutes from './messages.route';
import ModelsRoutes from './models.route';
import PermissionsRoutes from './permissions.route';
import ProvidersRoutes from './providers.route';
import CaseArchivesRoutes from './case-archives.route';
import AiArchiveRoutes from './ai-archive.route';
import AiEnterpriseRoutes from './ai-enterprise.route';
import AiEmergencyRoutes from './ai-emergency.route';
import AiArticlesRoutes from './ai-articles.route';
import AiEiaRoutes from './ai-eia.route';
import AiKnowledgeRoutes from './ai-knowledge.route';
import AiDocumentFormatRoutes from './ai-document-format.route';
import ResponsesRoutes from './responses.route';
import RolesRoutes from './roles.route';
import TopicsRoutes from './topics.route';
import UsersRoutes from './users.route';

export default {
  'agent-groups': AgentGroupsRoutes,
  'agents': AgentsRoutes,
  'files': FileRoutes,
  'knowledge-bases': KnowledgeBasesRoutes,
  'message-translations': MessageTranslationsRoutes,
  'messages': MessagesRoutes,
  'models': ModelsRoutes,
  'permissions': PermissionsRoutes,
  'providers': ProvidersRoutes,
  'case-archives': CaseArchivesRoutes,
  'ai-archive': AiArchiveRoutes,
  'ai-enterprise': AiEnterpriseRoutes,
  'ai-emergency': AiEmergencyRoutes,
  'ai-articles': AiArticlesRoutes,
  'ai-eia': AiEiaRoutes,
  'ai-knowledge': AiKnowledgeRoutes,
  'ai-document-format': AiDocumentFormatRoutes,
  'responses': ResponsesRoutes,
  'roles': RolesRoutes,
  'topics': TopicsRoutes,
  'users': UsersRoutes,
};
