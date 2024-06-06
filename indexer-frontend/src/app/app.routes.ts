import { Routes } from '@angular/router';

// _DEV
import { StatusComponent } from '@dev/status/status.component';
import { MessagesComponent } from '@dev/logs/messages/messages.component';
import { DocumentsComponent } from '@dev/logs/documents/documents.component';
import { NftsComponent } from '@dev/logs/nfts/nfts.component';
import { ElasticComponent } from '@dev/elastic/elastic.component';

//Home
import { SearchViewComponent } from '@views/search/search.component';
import { HomeComponent } from '@views/home/home.component';

//Details
import { TopicDetailsComponent } from '@views/details/topic-details/topic-details.component';
import { VcDocumentDetailsComponent } from '@views/details/vc-document-details/vc-document-details.component';
import { VpDocumentDetailsComponent } from '@views/details/vp-document-details/vp-document-details.component';
import { RegistryDetailsComponent } from '@views/details/registry-details/registry-details.component';

//Collections
import { VpDocumentsComponent } from '@views/collections/vp-documents/vp-documents.component';
import { VcDocumentsComponent } from '@views/collections/vc-documents/vc-documents.component';
import { RegistriesComponent } from '@views/collections/registries/registries.component';
import { RegistryUsersComponent } from '@views/collections/registry-users/registry-users.component';
import { RegistryUserDetailsComponent } from '@views/details/registry-user-details/registry-user-details.component';
import { ModulesComponent } from '@views/collections/modules/modules.component';
import { ToolsComponent } from '@views/collections/tools/tools.component';
import { PoliciesComponent } from '@views/collections/policies/policies.component';
import { TopicsComponent } from '@views/collections/topics/topics.component';
import { SchemasComponent } from '@views/collections/schemas/schemas.component';
import { TokensComponent } from '@views/collections/tokens/tokens.component';
import { RolesComponent } from '@views/collections/roles/roles.component';
import { DidDocumentsComponent } from '@views/collections/did-documents/did-documents.component';
import { ContractsComponent } from '@views/collections/contracts/contracts.component';
import { ModuleDetailsComponent } from '@views/details/module-details/module-details.component';
import { ToolDetailsComponent } from '@views/details/tool-details/tool-details.component';
import { PolicyDetailsComponent } from '@views/details/policy-details/policy-details.component';
import { SchemaDetailsComponent } from '@views/details/schema-details/schema-details.component';
import { RoleDetailsComponent } from '@views/details/role-details/role-details.component';
import { TokenDetailsComponent } from '@views/details/token-details/token-details.component';
import { NFTsComponent } from '@views/collections/nfts/nfts.component';
import { NFTDetailsComponent } from '@views/details/nft-details/nft-details.component';
import { DidDocumentDetailsComponent } from '@views/details/did-document-details/did-document-details.component';

export const routes: Routes = [
    // _DEV
    { path: 'status', component: StatusComponent },
    { path: 'elastic', component: ElasticComponent },
    { path: 'messages', component: MessagesComponent },
    { path: 'documents', component: DocumentsComponent },
    { path: 'tokens', component: TokensComponent },
    // { path: 'nfts', component: NftsComponent },

    //Home
    { path: '', component: HomeComponent },
    { path: 'search', component: SearchViewComponent },

    //Collections
    { path: 'registries', component: RegistriesComponent },
    { path: 'registry-users', component: RegistryUsersComponent },
    { path: 'policies', component: PoliciesComponent },
    { path: 'modules', component: ModulesComponent },
    { path: 'tools', component: ToolsComponent },
    { path: 'schemas', component: SchemasComponent },
    { path: 'tokens', component: TokensComponent },
    { path: 'roles', component: RolesComponent },
    { path: 'did-documents', component: DidDocumentsComponent },
    { path: 'vp-documents', component: VpDocumentsComponent },
    { path: 'vc-documents', component: VcDocumentsComponent },
    { path: 'nfts', component: NFTsComponent },
    { path: 'topics', component: TopicsComponent },
    { path: 'contracts', component: ContractsComponent },

    //Details
    { path: 'registries/:id', component: RegistryDetailsComponent },
    { path: 'registry-users/:id', component: RegistryUserDetailsComponent },
    { path: 'policies/:id', component: PolicyDetailsComponent },
    { path: 'schemas/:id', component: SchemaDetailsComponent },
    { path: 'topics/:id', component: TopicDetailsComponent },
    { path: 'tokens/:id', component: TokenDetailsComponent },
    { path: 'nfts/:id/:serialNumber', component: NFTDetailsComponent },
    { path: 'modules/:id', component: ModuleDetailsComponent },
    { path: 'tools/:id', component: ToolDetailsComponent },
    { path: 'roles/:id', component: RoleDetailsComponent },
    { path: 'did-documents/:id', component: DidDocumentDetailsComponent },
    { path: 'vc-documents/:id', component: VcDocumentDetailsComponent },
    { path: 'vp-documents/:id', component: VpDocumentDetailsComponent },
];
