import type {
  CreateSkillInput,
  ImportGitHubInput,
  ImportUrlInput,
  ImportZipInput,
  SkillImportResult,
  SkillItem,
  SkillListItem,
  SkillResourceContent,
  SkillResourceTreeNode,
  SkillSource,
  UpdateSkillInput,
} from '@lobechat/types';

import { lambdaClient } from '@/libs/trpc/client';

class AgentSkillService {
  // ===== Create =====

  async createSkill(params: CreateSkillInput): Promise<SkillItem | undefined> {
    return lambdaClient.agentSkills.create.mutate(params);
  }

  // ===== Import =====

  async importFromGitHub(params: ImportGitHubInput): Promise<SkillImportResult | undefined> {
    return lambdaClient.agentSkills.importFromGitHub.mutate(params);
  }

  async importFromUrl(params: ImportUrlInput): Promise<SkillImportResult | undefined> {
    return lambdaClient.agentSkills.importFromUrl.mutate(params);
  }

  async importFromZip(params: ImportZipInput): Promise<SkillImportResult | undefined> {
    return lambdaClient.agentSkills.importFromZip.mutate(params);
  }

  async importFromMarket(identifier: string): Promise<SkillImportResult | undefined> {
    return lambdaClient.agentSkills.importFromMarket.mutate({ identifier });
  }

  // ===== Query =====

  async getById(id: string, agentId?: string): Promise<SkillItem | undefined> {
    return lambdaClient.agentSkills.getById.query({ agentId, id });
  }

  async getZipUrl(id: string, agentId?: string): Promise<{ name: string; url: string | null }> {
    return lambdaClient.agentSkills.getByIdWithZipUrl.query({ agentId, id });
  }

  async getByIdentifier(identifier: string, agentId?: string): Promise<SkillItem | undefined> {
    return lambdaClient.agentSkills.getByIdentifier.query({
      agentId,
      identifier,
    });
  }

  async getByName(name: string, agentId?: string): Promise<SkillItem | undefined> {
    return lambdaClient.agentSkills.getByName.query({ agentId, name });
  }

  async list(
    source?: SkillSource,
    agentId?: string,
  ): Promise<{ data: SkillListItem[]; total: number }> {
    return lambdaClient.agentSkills.list.query(source || agentId ? { agentId, source } : undefined);
  }

  async search(query: string, agentId?: string): Promise<{ data: SkillListItem[]; total: number }> {
    return lambdaClient.agentSkills.search.query({ agentId, query });
  }

  // ===== Resources =====

  async listResources(
    id: string,
    includeContent?: boolean,
    agentId?: string,
  ): Promise<SkillResourceTreeNode[]> {
    return lambdaClient.agentSkills.listResources.query({
      agentId,
      id,
      includeContent,
    });
  }

  async readResource(id: string, path: string, agentId?: string): Promise<SkillResourceContent> {
    return lambdaClient.agentSkills.readResource.query({ agentId, id, path });
  }

  // ===== Update =====

  async updateSkill(params: UpdateSkillInput): Promise<SkillItem> {
    return lambdaClient.agentSkills.update.mutate({
      content: params.content,
      id: params.id,
      manifest: params.manifest,
    });
  }

  async setShared(id: string, shared: boolean): Promise<SkillItem | undefined> {
    return lambdaClient.agentSkills.setShared.mutate({ id, shared });
  }

  // ===== Delete =====

  // Server keeps delete idempotent: a missing row resolves to undefined.
  async deleteSkill(id: string): Promise<{ success: boolean } | undefined> {
    return lambdaClient.agentSkills.delete.mutate({ id });
  }
}

export const agentSkillService = new AgentSkillService();
