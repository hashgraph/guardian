export interface IPresentationRequest {
  presentation_request: {
    id: string,
    organization_id: string,
    is_archived: boolean,
    created_at: string,
    updated_at: string,
    name: string,
    description: string,
    redirect_base_uri: string,
    method: string,
    status: string,
    token_properties: {
      client_id: string,
      client_name: string,
      client_purpose: string,
      state: string,
      expires_at: string,
      presentation_definition_id: string,
      nonce: string,
      scope: string,
      response_mode: string,
      sub_jwk: string,
      redirect_uri: string,
      response_type: string,
    },
    tokens: {
      unsigned_request_jwt: string,
      signed_request_jwt: string
    }
  }
}

export interface ISubmission {
  id: string,
  presentation_request_id: string,
  vp_token: string,
  id_token: string,
  state: string,
  status: string,
  created_at: string,
  updated_at: string,
}

export interface IPresentationSubmissions {
  submissions: ISubmission[],
}

export interface IPresentationSubmission {
  submission: ISubmission,
}