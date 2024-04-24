import { Routes } from '@angular/router';

// _DEV
import { StatusComponent } from '@dev/status/status.component';
import { MessagesComponent } from '@dev/logs/messages/messages.component';
import { TopicsComponent } from '@dev/logs/topics/topics.component';
import { DocumentsComponent } from '@dev/logs/documents/documents.component';
import { TokensComponent } from '@dev/logs/tokens/tokens.component';
import { NftsComponent } from '@dev/logs/nfts/nfts.component';
import { ElasticComponent } from '@dev/elastic/elastic.component';

//Home
import { SearchViewComponent } from '@views/search/search.component';
import { HomeComponent } from '@views/home/home.component';

//Details
import { DidDocumentDetailsComponent } from '@views/details/did-document-details/did-document-details.component';
import { EventDetailsComponent } from '@views/details/event-details/event-details.component';
import { InstancePolicyDetailsComponent } from '@views/details/instance-policy-details/instance-policy-details.component';
import { MessageDetailsComponent } from '@views/details/message-details/message-details.component';
import { ModuleDetailsComponent } from '@views/details/module-details/module-details.component';
import { PolicyDetailsComponent } from '@views/details/policy-details/policy-details.component';
import { RoleDetailsComponent } from '@views/details/role-details/role-details.component';
import { SchemaDetailsComponent } from '@views/details/schema-details/schema-details.component';
import { StandardRegistryDetailsComponent } from '@views/details/standard-registry-details/standard-registry-details.component';
import { TagDetailsComponent } from '@views/details/tag-details/tag-details.component';
import { TokenDetailsComponent } from '@views/details/token-details/token-details.component';
import { TokenDocumentDetailsComponent } from '@views/details/token-document-details/token-document-details.component';
import { ToolDetailsComponent } from '@views/details/tool-details/tool-details.component';
import { TopicDetailsComponent } from '@views/details/topic-details/topic-details.component';
import { TopicDocumentDetailsComponent } from '@views/details/topic-document-details/topic-document-details.component';
import { VcDocumentDetailsComponent } from '@views/details/vc-document-details/vc-document-details.component';
import { VpDocumentDetailsComponent } from '@views/details/vp-document-details/vp-document-details.component';
import { ContractDetailsComponent } from '@views/details/contract-details/contract-details.component';

//Collections
import { VpDocumentsComponent } from '@views/collections/vp-documents/vp-documents.component';

export const routes: Routes = [

    // _DEV
    { path: 'status', component: StatusComponent },
    { path: 'elastic', component: ElasticComponent },
    { path: 'messages', component: MessagesComponent },
    { path: 'topics', component: TopicsComponent },
    { path: 'documents', component: DocumentsComponent },
    { path: 'tokens', component: TokensComponent },
    { path: 'nfts', component: NftsComponent },

    //Home
    { path: '', component: HomeComponent },
    { path: 'search', component: SearchViewComponent },

    //Collections
    { path: 'vp-documents', component: VpDocumentsComponent },

    //Details
    { path: 'did-documents/:id', component: DidDocumentDetailsComponent },
    { path: 'events/:id', component: EventDetailsComponent },
    { path: 'instance-policies/:id', component: InstancePolicyDetailsComponent },
    { path: 'messages/:id', component: MessageDetailsComponent },
    { path: 'modules/:id', component: ModuleDetailsComponent },
    { path: 'policies/:id', component: PolicyDetailsComponent },
    { path: 'roles/:id', component: RoleDetailsComponent },
    { path: 'schemas/:id', component: SchemaDetailsComponent },
    { path: 'standard-registries/:id', component: StandardRegistryDetailsComponent },
    { path: 'tags/:id', component: TagDetailsComponent },
    { path: 'tokens/:id', component: TokenDetailsComponent },
    { path: 'token-documents/:id', component: TokenDocumentDetailsComponent },
    { path: 'tools/:id', component: ToolDetailsComponent },
    { path: 'topics/:id', component: TopicDetailsComponent },
    { path: 'topic-documents/:id', component: TopicDocumentDetailsComponent },
    { path: 'vc-documents/:id', component: VcDocumentDetailsComponent },
    { path: 'vp-documents/:id', component: VpDocumentDetailsComponent },
    { path: 'contracts/:id', component: ContractDetailsComponent },
];
