import { ResponseType } from "@tauri-apps/api/http";

import type {
  ConfirmSignupInput,
  CreateSDGenerationJobInput,
  CreateSDGenerationJobResponse,
  GetAIGenerationFeedInput,
  GetAIGenerationFeedResponse,
  GetSessionResponse,
  GetUserDetailsResponse,
  LoginInput,
  SignupInput,
  StartUserAlchemyTrialResponse,
} from "./types";
import fetchCookie from "~/utils/fetchCookie";
import { gql } from "../utils";
import { log } from "~/utils/log";

export class Leonardo {
  private fetch = fetchCookie({
    throwOnFail: true
  });
  userId: string | null = null;

  private async graphql<TResult = unknown, TVariables = unknown>(data: {
    operationName: string;
    query: string;
    variables?: TVariables;
  }): Promise<TResult> {
    const session = await this.getSession();

    const resp = await this.fetch<
      { data: TResult } | { errors: { message: string }[] }
    >("https://api.leonardo.ai/v1/graphql", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
      },
      body: {
        payload: data,
        type: "Json",
      },
    });

    if ("errors" in resp.data) {
      const errMessage = `Graphql Error (${data.operationName}): ${resp.data.errors
        .map((err) => err.message)
        .join(", ")}`

      void log.wallpaperGeneration.error(errMessage)
      throw new Error(errMessage);
    }

    return resp.data.data;
  }

  async getCsrf() {
    const resp = await this.fetch<{ csrfToken: string }>(
      "https://app.leonardo.ai/api/auth/csrf",
      {
        method: "GET",
      },
    );

    return resp.data.csrfToken;
  }

  async login({ username, password }: LoginInput) {
    const csrfToken = await this.getCsrf();

    await this.fetch("https://app.leonardo.ai/api/auth/callback/credentials", {
      method: "POST",
      body: {
        payload: {
          username,
          password,
          redirect: false,
          csrfToken,
          callbackUrl: "https://app.leonardo.ai/api/auth/session",
          json: true,
        },
        type: "Json",
      },
      responseType: ResponseType.Text,
    });

    await this.getSession();
  }

  async signup({ email, password }: SignupInput) {
    await this.fetch("https://app.leonardo.ai/api/auth/signup", {
      method: "POST",
      responseType: ResponseType.Text,
      body: {
        payload: { email, password },
        type: "Json",
      },
    });
  }

  async confirmSignup({
    confirmation_code,
    email,
    password,
  }: ConfirmSignupInput) {
    await this.fetch("https://app.leonardo.ai/api/auth/confirm-signup", {
      method: "POST",
      body: {
        payload: {
          email,
          password,
          confirmation_code,
        },
        type: "Json",
      },
    });
  }

  public async getSession(): Promise<GetSessionResponse> {
    const { data } = await this.fetch<GetSessionResponse>(
      "https://app.leonardo.ai/api/auth/session",
      {
        method: "GET",
      },
    );

    return data;
  }

  async updateUsername(newUsername: string) {
    const query = gql`
      mutation UpdateUsername($arg1: UpdateUsernameInput!) {
        updateUsername(arg1: $arg1) {
          id
          __typename
        }
      }
    `;

    const { updateUsername } = await this.graphql<{
      updateUsername: { id: string };
    }>({
      operationName: "UpdateUsername",
      query,
      variables: { arg1: { username: newUsername } },
    });

    this.userId = updateUsername.id;
  }

  private requireUserId(): asserts this is { userId: string } {
    if (!this.userId) {
      void log.wallpaperGeneration.error("userId is not defined")
      throw new Error("userId is not defined");
    }
  }

  async updateUserDetails() {
    this.requireUserId()

    const query = gql`
      mutation UpdateUserDetails(
        $where: user_details_bool_exp!
        $_set: user_details_set_input
      ) {
        update_user_details(where: $where, _set: $_set) {
          affected_rows
          __typename
        }
      }
    `;

    await this.graphql({
      operationName: "UpdateUserDetails",
      query,
      variables: {
        where: { userId: { _eq: this.userId } },
        _set: { showNsfw: true, interests: ["OTHER"] },
      },
    });
  }

  async getUserDetails() {
    const { user } = await this.getSession();

    const query = gql`
      query GetUserDetails($userSub: String) {
        users(where: { user_details: { cognitoId: { _eq: $userSub } } }) {
          id
          username
          blocked
          __typename
        }
      }
    `;

    const { users } = await this.graphql<GetUserDetailsResponse>({
      operationName: "GetUserDetails",
      query,
      variables: {
        userSub: user.sub,
      },
    });

    const userDetails = users[0];

    if (userDetails) {
      this.userId = userDetails.id;
    }

    return userDetails;
  }

  async createSDGenerationJob(data: CreateSDGenerationJobInput) {
    this.requireUserId()

    const query = gql`
      mutation CreateSDGenerationJob($arg1: SDGenerationInput!) {
        sdGenerationJob(arg1: $arg1) {
          generationId
          __typename
        }
      }
    `;

    const result = await this.graphql<CreateSDGenerationJobResponse>({
      operationName: "CreateSDGenerationJob",
      query,
      variables: {
        arg1: {
          negative_prompt: "",
          nsfw: true,
          num_inference_steps: 10,
          guidance_scale: 15,
          sd_version: "SDXL_0_9",
          presetStyle: "CINEMATIC",
          scheduler: "LEONARDO",
          public: true,
          tiling: false,
          leonardoMagic: false,
          photoRealStrength: 0.55,
          alchemy: true,
          highResolution: false,
          contrastRatio: 0.5,
          poseToImage: false,
          poseToImageType: "POSE",
          weighting: 0.75,
          highContrast: true,
          expandedDomain: true,
          elements: [],
          controlnets: [],
          photoReal: true,
          photoRealVersion: "v1",
          ...data,
        },
      },
    });

    return result;
  }

  async getAIGenerationFeed(data: GetAIGenerationFeedInput) {
    this.requireUserId()

    const query = gql`
      query GetAIGenerationFeed(
        $where: generations_bool_exp = {}
        $userId: uuid
        $limit: Int
        $offset: Int = 0
      ) {
        generations(
          limit: $limit
          offset: $offset
          order_by: [{ createdAt: desc }]
          where: $where
        ) {
          id
          status
          generated_images(order_by: [{ url: desc }]) {
            id
            url
            __typename
          }
          __typename
        }
      }
    `;

    const result = await this.graphql<GetAIGenerationFeedResponse>({
      operationName: "GetAIGenerationFeed",
      query,
      variables: {
        where: {
          userId: {
            _eq: this.userId,
          },
          teamId: {
            _is_null: true,
          },
          status: {
            _in: ["COMPLETE", "FAILED"],
          },
          id: {
            _in: [data.generationId],
          },
          isStoryboard: {
            _eq: false,
          },
        },
        offset: 0,
      },
    });

    return result;
  }

  async startUserAlchemyTrial() {
    this.requireUserId()

    const query = gql`
      mutation StartUserAlchemyTrial {
        startUserAlchemyTrial {
          id
          isInTrialPeriod
          hasReachedDailyLimit
          __typename
        }
      }
    `;

    const result = await this.graphql<StartUserAlchemyTrialResponse>({
      operationName: "StartUserAlchemyTrial",
      query,
    });

    return result;
  }
}
