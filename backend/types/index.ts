export interface ActivityOptions {
  limit?: number;
  offset?: number;
  activityType?: string;
  actionType?: string;
  entityType?: string;
  startDate?: string;
  endDate?: string;
}

export interface ActivityData {
  userId: string;
  activityType: string;
  actionType: string;
  entityId: string;
  entityType: string;
  metadata?: any;
  ipAddress?: string;
  userAgent?: string;
}

export interface Activity {
  id: string;
  user_id: string;
  activity_type_id: string;
  action_id: string;
  entity_id: string | null;
  entity_type: string | null;
  metadata: string | null;
  created_at: Date;
  entity_details?: object;
}

export interface ActivityType {
  id: string;
  name: string;
}

export interface ActionType {
  id: string;
  name: string;
}

export interface ModeratorPermission {
  community_id: string;
  user_id: string;
  can_manage_settings: boolean;
  can_manage_members: boolean;
  can_manage_posts: boolean;
  can_manage_comments: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface ModeratorPermissionInput {
  can_manage_settings?: boolean;
  can_manage_members?: boolean;
  can_manage_posts?: boolean;
  can_manage_comments?: boolean;
}

export interface ExtendedCommunitySettings {
  community_id: string;
  allow_post_images: boolean;
  allow_post_links: boolean;
  require_post_approval: boolean;
  restricted_words: string | null;
  custom_theme_color: string | null;
  custom_banner_url: string | null;
  minimum_account_age_days: number;
  minimum_karma_required: number;
  updated_at: Date;
}

export interface ExtendedCommunitySettingsInput {
  allow_post_images?: boolean;
  allow_post_links?: boolean;
  require_post_approval?: boolean;
  restricted_words?: string;
  custom_theme_color?: string;
  custom_banner_url?: string;
  minimum_account_age_days?: number;
  minimum_karma_required?: number;
}

export interface PostModeration {
  post_id: string;
  status: 'pending' | 'approved' | 'rejected';
  moderator_id: string | null;
  reason: string | null;
  moderated_at: Date | null;
  created_at: Date;
}
