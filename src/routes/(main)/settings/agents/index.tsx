'use client';

/**
 * 智能体管理设置页。
 *
 * 复用 `/agents` 的管理页面（含管理员鉴权与 403 兜底），
 * 使其成为设置“智能体”分组下与“AI 服务商”“服务模型”并列的二级菜单项。
 */
export { default } from '@/routes/(main)/agents';
