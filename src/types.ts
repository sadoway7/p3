export interface Community {
  __typename?: 'Community';
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  membersCount: number;
  postsCount: number;
  rules?: CommunityRule[];
  moderators?: string[];
  bannerImage?: string;
  iconImage?: string;
}

export interface CommunityRule {
  id: string;
  title: string;
  description: string;
}

export interface CreateCommunityInput {
  name: string;
  description: string;
  rules?: CommunityRule[];
  bannerImage?: string;
  iconImage?: string;
}

export interface UpdateCommunityInput {
  name?: string;
  description?: string;
  rules?: CommunityRule[];
  bannerImage?: string;
  iconImage?: string;
}
