export type SignupInput = {
  email: string;
  password: string;
};

export type ConfirmSignupInput = {
  email: string;
  password: string;
  confirmation_code: string;
};

export type LoginInput = {
  username: string;
  password: string;
};

export type CreateSDGenerationJobInput = {
  prompt: string;
  negative_prompt?: string;
  nsfw?: boolean;
  num_images: number;
  width: number;
  height: number;
  alchemy?: boolean;
  photoReal?: boolean;
};

export type CreateSDGenerationJobResponse = {
  sdGenerationJob: {
    generationId: string;
    __typename: "SDGenerationOutput";
  };
};

export type GetAIGenerationFeedInput = {
  generationId: string;
};

export type GetAIGenerationFeedResponse = {
  generations: {
    generated_images: {
      id: string;
      url: string;
    }[];
    status: "COMPLETE" | "FAILED";
    __typename: "generations";
  }[];
};

export type GetSessionResponse = {
  user: {
    email: string;
    sub: string;
  };
  expires: string;
  accessToken: string;
  accessTokenIssuedAt: number;
  accessTokenExpiry: number;
  serverTimestamp: number;
};

export type GetUserDetailsResponse = {
  users: {
    id: string;
    username: string;
    blocked: boolean;
    __typename: "users";
  }[];
};

export type StartUserAlchemyTrialResponse = {
  startUserAlchemyTrial: {
    id: string;
    isInTrialPeriod: boolean;
    hasReachedDailyLimit: boolean;
    __typename: "AlchemyTrial";
  };
};
