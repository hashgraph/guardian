export interface IMe {
  user: {
    id: string,
    full_name: string,
    email: string,
    country: string,
    joined_at: string,
    onboarded_at: string,
    timezone: string,
    did: string,
    private_dek_external_id: string,
    queued_for_deletion_after: string,
    broken_attachments_present: boolean,
    accepted_terms: boolean,
    user_type: string,
  },
  data_size_of_uploaded_attachments_and_folders: number,
  data_size_limit: number,
  data_size_limit_exceeded: boolean
}