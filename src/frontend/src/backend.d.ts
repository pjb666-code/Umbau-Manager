import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export class ExternalBlob {
    getBytes(): Promise<Uint8Array<ArrayBuffer>>;
    getDirectURL(): string;
    static fromURL(url: string): ExternalBlob;
    static fromBytes(blob: Uint8Array<ArrayBuffer>): ExternalBlob;
    withUploadProgress(onProgress: (percentage: number) => void): ExternalBlob;
}
export type Time = bigint;
export interface Task {
    id: TaskId;
    status: string;
    titel: string;
    bereich: Bereich;
    owner: Principal;
    verantwortlicherKontakt?: ContactId;
    projectId?: ProjectId;
    kategorie: string;
    faelligkeit: Time;
    dringlichkeit: bigint;
    beschreibung: string;
    gewerke: string;
}
export interface Document {
    id: DocumentId;
    typ: string;
    status: string;
    bereich: Bereich;
    owner: Principal;
    blob: ExternalBlob;
    name: string;
}
export interface MediaPositionUpdate {
    newPosition: bigint;
    mediaId: MediaId;
}
export type CostItemId = string;
export interface InviteCode {
    created: Time;
    code: string;
    used: boolean;
}
export type InviteToken = string;
export interface MediaUpdate {
    typ?: string;
    name?: string;
    tags?: Array<string>;
    kategorie?: string;
    position?: bigint;
}
export type DocumentId = string;
export interface InviteCode__1 {
    code: string;
    role: UserRole;
}
export interface KostenUebersicht {
    offen: number;
    gesamt: number;
    bezahlt: number;
}
export interface Media {
    id: MediaId;
    typ: string;
    owner: Principal;
    blob: ExternalBlob;
    name: string;
    tags: Array<string>;
    kategorie: string;
    position: bigint;
}
export interface Contact {
    id: ContactId;
    firma: string;
    owner: Principal;
    name: string;
    notizen: string;
    verknuepfteTasks: Array<TaskId>;
    email: string;
    verknuepfteDokumente: Array<DocumentId>;
    telefon: string;
    rolle: string;
}
export interface HelpfulLink {
    id: LinkId;
    url: string;
    titel: string;
    owner: Principal;
    logoUrl: string;
    kategorie: string;
    beschreibung: string;
}
export interface RSVP {
    name: string;
    inviteCode: string;
    timestamp: Time;
    attending: boolean;
}
export type Bereich = string;
export type LinkId = string;
export type TaskId = string;
export type ProjectId = string;
export interface CostItem {
    id: CostItemId;
    status: string;
    owner: Principal;
    dokumentId?: DocumentId;
    projektId: ProjectId;
    betrag: number;
    kategorie: string;
    beschreibung: string;
    datum: Time;
    handwerker?: string;
}
export interface TeamMember {
    principal: Principal;
    role: UserRole;
}
export type ContactId = string;
export interface Project {
    id: ProjectId;
    endDate?: Time;
    owner: Principal;
    name: string;
    color: string;
    verantwortlicherKontakt?: ContactId;
    kategorie: string;
    parentProjectId?: ProjectId;
    kunde: string;
    startDate?: Time;
}
export type MediaId = string;
export interface UserProfile {
    userType: UserType;
    name: string;
    role: string;
    email: string;
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export enum UserType {
    business = "business",
    privat = "privat"
}
export interface backendInterface {
    addKostenpunkt(projectId: ProjectId, kost: CostItem): Promise<void>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    bulkUpdateMediaPositions(updates: Array<MediaPositionUpdate>): Promise<void>;
    claimInviteToken(token: InviteToken): Promise<void>;
    createContact(id: ContactId, name: string, firma: string, rolle: string, email: string, telefon: string, notizen: string, verknuepfteTasks: Array<TaskId>, verknuepfteDokumente: Array<DocumentId>): Promise<void>;
    createHelpfulLink(id: LinkId, titel: string, beschreibung: string, url: string, kategorie: string, logoUrl: string): Promise<void>;
    createInvite(generatedCode: string, role: UserRole): Promise<void>;
    createInviteToken(role: UserRole): Promise<InviteToken>;
    createProjekt(id: ProjectId, name: string, kunde: string | null, color: string, start: Time | null, end: Time | null, kategorie: string, verantwortlicherKontakt: ContactId | null, costItemsArray: Array<CostItem>, parentProjectId: ProjectId | null): Promise<void>;
    createTask(id: TaskId, titel: string, beschreibung: string, gewerke: string, status: string, dringlichkeit: bigint, bereich: Bereich, faelligkeit: Time, kategorie: string, verantwortlicherKontakt: ContactId | null, projectId: ProjectId | null): Promise<void>;
    deleteContact(contactId: ContactId): Promise<void>;
    deleteDocument(documentId: DocumentId): Promise<void>;
    deleteHelpfulLink(linkId: LinkId): Promise<void>;
    deleteKostenpunkt(projectId: ProjectId, kostenpunktId: CostItemId): Promise<void>;
    deleteProjekt(id: ProjectId): Promise<void>;
    deleteTask(taskId: TaskId): Promise<void>;
    deleteUserMedia(mediaId: string): Promise<void>;
    filterProjectsByUserType(userType: UserType): Promise<Array<Project>>;
    generateInviteCode(): Promise<string>;
    getAllContacts(): Promise<Array<Contact>>;
    getAllHelpfulLinks(): Promise<Array<HelpfulLink>>;
    getAllKostenpunkte(): Promise<Array<CostItem>>;
    getAllProjects(): Promise<Array<Project>>;
    getAllRSVPs(): Promise<Array<RSVP>>;
    getAllTasks(): Promise<Array<Task>>;
    getAllUserProjects(): Promise<Array<[ProjectId, Project]>>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getContact(contactId: ContactId): Promise<Contact>;
    getDocumentsByProject(projectId: ProjectId): Promise<Array<Document>>;
    getHelpfulLink(linkId: LinkId): Promise<HelpfulLink>;
    getInviteCode(generatedCode: string): Promise<InviteCode__1 | null>;
    getInviteCodes(): Promise<Array<InviteCode>>;
    getKostenUebersicht(projektId: ProjectId | null): Promise<KostenUebersicht>;
    getKostenpunkteByProjectAndPhases(projectId: ProjectId): Promise<Array<CostItem>>;
    getKostenpunkteByProjekt(projectId: ProjectId): Promise<Array<CostItem>>;
    getMediaByProject(projectId: ProjectId): Promise<Array<Media>>;
    getPhasesByProject(parentId: ProjectId): Promise<Array<Project>>;
    getProjekt(id: ProjectId): Promise<Project>;
    getTask(taskId: TaskId): Promise<Task>;
    getTasksByProject(projectId: ProjectId): Promise<Array<Task>>;
    getTopLevelProjects(): Promise<Array<Project>>;
    getUserDocuments(): Promise<Array<Document>>;
    getUserMedia(): Promise<Array<Media>>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    initializeAccessControl(): Promise<void>;
    isCallerAdmin(): Promise<boolean>;
    listTeamMembers(): Promise<Array<TeamMember>>;
    removeTeamMember(principal: Principal): Promise<void>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    submitRSVP(name: string, attending: boolean, inviteCode: string): Promise<void>;
    updateContact(id: ContactId, name: string, firma: string, rolle: string, email: string, telefon: string, notizen: string, verknuepfteTasks: Array<TaskId>, verknuepfteDokumente: Array<DocumentId>): Promise<void>;
    updateHelpfulLink(id: LinkId, titel: string, beschreibung: string, url: string, kategorie: string, logoUrl: string): Promise<void>;
    updateKostenpunkt(projectId: ProjectId, kostId: CostItemId, updatedKost: CostItem): Promise<void>;
    updateMedia(id: string, updates: MediaUpdate): Promise<void>;
    updateProjekt(id: ProjectId, name: string, kunde: string | null, color: string, start: Time | null, end: Time | null, kategorie: string, verantwortlicherKontakt: ContactId | null, costItemsArray: Array<CostItem>): Promise<void>;
    updateTask(id: TaskId, titel: string, beschreibung: string, gewerke: string, status: string, dringlichkeit: bigint, bereich: Bereich, faelligkeit: Time, kategorie: string, verantwortlicherKontakt: ContactId | null, projectId: ProjectId | null): Promise<void>;
    updateTeamMemberRole(principal: Principal, role: UserRole): Promise<void>;
    uploadDocumentWithPDF(id: string, name: string, bereich: Bereich, typ: string, status: string, blob: ExternalBlob, projectId: ProjectId | null): Promise<void>;
    uploadMedia(id: string, name: string, kategorie: string, typ: string, position: bigint, tags: Array<string>, blob: ExternalBlob, projectId: ProjectId | null): Promise<void>;
    validateInviteCode(generatedCode: string): Promise<void>;
}
