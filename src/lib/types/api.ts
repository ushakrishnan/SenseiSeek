// src/lib/types/api.ts
export interface GithubInsightsRequest { repo: string }
export interface GithubInsightsResponse { skills: string[]; repoName: string }

export interface ApiError { ok: false; error: string }
export interface ApiOk<T = any> { ok: true; data: T }

export type ApiResponse<T = any> = ApiOk<T> | ApiError;
