import Map "mo:core/Map";
import Set "mo:core/Set";
import Array "mo:core/Array";
import Iter "mo:core/Iter";
import Time "mo:core/Time";
import Run "mo:core/Runtime";
import Text "mo:core/Text";
import Principal "mo:core/Principal";
import AccessControl "authorization/access-control";
import Storage "blob-storage/Storage";
import MixinStorage "blob-storage/Mixin";
import InviteLinksModule "invite-links/invite-links-module";

import Random "mo:core/Random";


actor {
  include MixinStorage();

  let accessControlState = AccessControl.initState();
  public type ProjectId = Text;
  public type TaskId = Text;
  public type DocumentId = Text;
  public type MediaId = Text;
  public type Bereich = Text;
  public type ContactId = Text;
  public type LinkId = Text;
  public type TextValue = Text;
  public type MediaType = Text;
  public type CostItemId = Text;
  public type UserType = { #privat; #business };
  public type Project = {
    id : ProjectId;
    name : Text;
    kunde : Text;
    color : Text;
    startDate : ?Time.Time;
    endDate : ?Time.Time;
    kategorie : Text;
    verantwortlicherKontakt : ?ContactId;
    parentProjectId : ?ProjectId;
    owner : Principal;
  };
  public type Task = {
    id : TaskId;
    titel : Text;
    beschreibung : Text;
    gewerke : Text;
    status : Text;
    dringlichkeit : Nat;
    bereich : Bereich;
    faelligkeit : Time.Time;
    kategorie : Text;
    verantwortlicherKontakt : ?ContactId;
    projectId : ?ProjectId;
    owner : Principal;
  };
  public type Document = {
    id : DocumentId;
    name : Text;
    bereich : Bereich;
    typ : Text;
    status : Text;
    blob : Storage.ExternalBlob;
    owner : Principal;
  };
  public type Media = {
    id : MediaId;
    name : Text;
    kategorie : Text;
    typ : Text;
    position : Int;
    tags : [Text];
    blob : Storage.ExternalBlob;
    owner : Principal;
  };
  public type MediaPositionUpdate = {
    mediaId : MediaId;
    newPosition : Int;
  };
  public type DocumentUpdate = {
    name : ?Text;
    bereich : ?Bereich;
    typ : ?Text;
    status : ?Text;
    blob : ?Storage.ExternalBlob;
  };
  public type MediaUpdate = {
    name : ?Text;
    kategorie : ?Text;
    typ : ?Text;
    position : ?Int;
    tags : ?[Text];
  };
  public type UserProfile = {
    name : Text;
    email : Text;
    role : Text;
    userType : UserType;
  };
  public type Contact = {
    id : ContactId;
    name : Text;
    firma : Text;
    rolle : Text;
    email : Text;
    telefon : Text;
    notizen : Text;
    verknuepfteTasks : [TaskId];
    verknuepfteDokumente : [DocumentId];
    owner : Principal;
  };
  public type HelpfulLink = {
    id : LinkId;
    titel : Text;
    beschreibung : Text;
    url : Text;
    kategorie : Text;
    logoUrl : Text;
    owner : Principal;
  };
  public type CostItem = {
    id : CostItemId;
    beschreibung : Text;
    betrag : Float;
    kategorie : Text;
    status : Text;
    datum : Time.Time;
    projektId : ProjectId;
    handwerker : ?Text;
    dokumentId : ?DocumentId;
    owner : Principal;
  };

  public type InviteToken = Text;
  public type TeamMember = {
    principal : Principal;
    role : AccessControl.UserRole;
  };

  public type InviteCode = {
    code : Text;
    role : AccessControl.UserRole;
  };

  var projects = Map.empty<Principal, Map.Map<ProjectId, Project>>();
  var tasks = Map.empty<Principal, Map.Map<TaskId, Task>>();
  var documents = Map.empty<Principal, Map.Map<DocumentId, Document>>();
  var media = Map.empty<Principal, Map.Map<MediaId, Media>>();
  var contacts = Map.empty<Principal, Map.Map<ContactId, Contact>>();
  var links = Map.empty<Principal, Map.Map<LinkId, HelpfulLink>>();
  var completedTasks = Map.empty<Principal, Set.Set<TaskId>>();
  var userProfiles = Map.empty<Principal, UserProfile>();
  var customCategoriesStore = Map.empty<Principal, Map.Map<TextValue, Map.Map<TextValue, TextValue>>>();
  var costItems = Map.empty<Principal, Map.Map<ProjectId, [CostItem]>>();
  var inviteTokens = Map.empty<InviteToken, ?AccessControl.UserRole>();
  var inviteOwners = Map.empty<InviteToken, Principal>();
  var projectSharing = Map.empty<Principal, Principal>();
  var teamMembers = Map.empty<Principal, AccessControl.UserRole>();
  let inviteState = InviteLinksModule.initState();

  var documentProjectMap = Map.empty<DocumentId, ProjectId>();
  var mediaProjectMap = Map.empty<MediaId, ProjectId>();

  var codesMap = Map.empty<Text, InviteCode>();

  func getUserData<T>(user : Principal, map : Map.Map<Principal, Map.Map<Text, T>>) : Map.Map<Text, T> {
    switch (map.get(user)) {
      case (null) {
        let newMap = Map.empty<Text, T>();
        map.add(user, newMap);
        newMap;
      };
      case (?userMap) { userMap };
    };
  };

  func getUserProjects(user : Principal) : Map.Map<ProjectId, Project> {
    getUserData<Project>(user, projects);
  };
  func getUserTasks(user : Principal) : Map.Map<TaskId, Task> {
    getUserData<Task>(user, tasks);
  };
  func getUserDocumentsInternal(user : Principal) : Map.Map<DocumentId, Document> {
    getUserData<Document>(user, documents);
  };
  func getUserMediaInternal(user : Principal) : Map.Map<MediaId, Media> {
    getUserData<Media>(user, media);
  };
  func getUserContacts(user : Principal) : Map.Map<ContactId, Contact> {
    getUserData<Contact>(user, contacts);
  };
  func getUserLinks(user : Principal) : Map.Map<LinkId, HelpfulLink> {
    getUserData<HelpfulLink>(user, links);
  };
  func getUserCompletedTasks(user : Principal) : Set.Set<TaskId> {
    switch (completedTasks.get(user)) {
      case (null) {
        let newSet = Set.empty<TaskId>();
        completedTasks.add(user, newSet);
        newSet;
      };
      case (?userSet) { userSet };
    };
  };
  // Returns the principal to use for data lookups.
  // Invited users (those with a projectSharing entry) see the inviter's data.
  func effectiveOwner(caller : Principal) : Principal {
    switch (projectSharing.get(caller)) {
      case (?owner) { owner };
      case (null) { caller };
    };
  };


  func getUserCustomCategories(user : Principal) : Map.Map<TextValue, Map.Map<TextValue, TextValue>> {
    switch (customCategoriesStore.get(user)) {
      case (null) {
        let newMap = Map.empty<TextValue, Map.Map<TextValue, TextValue>>();
        customCategoriesStore.add(user, newMap);
        newMap;
      };
      case (?userMap) { userMap };
    };
  };
  func getUserCostItems(user : Principal) : Map.Map<ProjectId, [CostItem]> {
    switch (costItems.get(user)) {
      case (null) {
        let newMap = Map.empty<ProjectId, [CostItem]>();
        costItems.add(user, newMap);
        newMap;
      };
      case (?userMap) { userMap };
    };
  };

  public shared ({ caller }) func createTask(
    id : TaskId,
    titel : Text,
    beschreibung : Text,
    gewerke : Text,
    status : Text,
    dringlichkeit : Nat,
    bereich : Bereich,
    faelligkeit : Time.Time,
    kategorie : Text,
    verantwortlicherKontakt : ?ContactId,
    projectId : ?ProjectId,
  ) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Run.trap("Unauthorized: Only users can create tasks");
    };
    let userTasks = getUserTasks(effectiveOwner(caller));
    let task : Task = {
      id;
      titel;
      beschreibung;
      gewerke;
      status;
      dringlichkeit;
      bereich;
      faelligkeit;
      kategorie;
      verantwortlicherKontakt;
      projectId;
      owner = effectiveOwner(caller);
    };
    if (userTasks.containsKey(id)) {
      Run.trap("Task already exists");
    };
    userTasks.add(id, task);
  };

  public shared ({ caller }) func createContact(
    id : ContactId,
    name : Text,
    firma : Text,
    rolle : Text,
    email : Text,
    telefon : Text,
    notizen : Text,
    verknuepfteTasks : [TaskId],
    verknuepfteDokumente : [DocumentId],
  ) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Run.trap("Unauthorized: Only users can create contacts");
    };
    let userContacts = getUserContacts(effectiveOwner(caller));
    let contact : Contact = {
      id;
      name;
      firma;
      rolle;
      email;
      telefon;
      notizen;
      verknuepfteTasks;
      verknuepfteDokumente;
      owner = effectiveOwner(caller);
    };
    if (userContacts.containsKey(id)) {
      Run.trap("Contact already exists");
    };
    userContacts.add(id, contact);
  };

  public shared ({ caller }) func createHelpfulLink(
    id : LinkId,
    titel : Text,
    beschreibung : Text,
    url : Text,
    kategorie : Text,
    logoUrl : Text,
  ) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Run.trap("Unauthorized: Only users can create links");
    };
    let userLinks = getUserLinks(effectiveOwner(caller));
    let link : HelpfulLink = {
      id;
      titel;
      beschreibung;
      url;
      kategorie;
      logoUrl;
      owner = effectiveOwner(caller);
    };
    if (userLinks.containsKey(id)) {
      Run.trap("Link already exists");
    };
    userLinks.add(id, link);
  };

  public query ({ caller }) func getTask(taskId : TaskId) : async Task {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Run.trap("Unauthorized: Only users can view tasks");
    };
    let userTasks = getUserTasks(effectiveOwner(caller));
    switch (userTasks.get(taskId)) {
      case (null) {
        Run.trap("Task not found");
      };
      case (?task) {
        if (task.owner != caller and not AccessControl.isAdmin(accessControlState, caller)) {
          Run.trap("Unauthorized: You can only view your own tasks");
        };
        task;
      };
    };
  };

  public query ({ caller }) func getContact(contactId : ContactId) : async Contact {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Run.trap("Unauthorized: Only users can view contacts");
    };
    let userContacts = getUserContacts(effectiveOwner(caller));
    switch (userContacts.get(contactId)) {
      case (null) {
        Run.trap("Contact not found");
      };
      case (?contact) {
        if (contact.owner != caller and not AccessControl.isAdmin(accessControlState, caller)) {
          Run.trap("Unauthorized: You can only view your own contacts");
        };
        contact;
      };
    };
  };

  public query ({ caller }) func getHelpfulLink(linkId : LinkId) : async HelpfulLink {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Run.trap("Unauthorized: Only users can view links");
    };
    let userLinks = getUserLinks(effectiveOwner(caller));
    switch (userLinks.get(linkId)) {
      case (null) {
        Run.trap("Link not found");
      };
      case (?link) {
        if (link.owner != caller and not AccessControl.isAdmin(accessControlState, caller)) {
          Run.trap("Unauthorized: You can only view your own links");
        };
        link;
      };
    };
  };

  public query ({ caller }) func getAllTasks() : async [Task] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Run.trap("Unauthorized: Only users can view tasks");
    };
    getUserTasks(effectiveOwner(caller)).values().toArray();
  };

  public query ({ caller }) func getAllContacts() : async [Contact] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Run.trap("Unauthorized: Only users can view contacts");
    };
    getUserContacts(effectiveOwner(caller)).values().toArray();
  };

  public query ({ caller }) func getAllHelpfulLinks() : async [HelpfulLink] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Run.trap("Unauthorized: Only users can view links");
    };
    getUserLinks(effectiveOwner(caller)).values().toArray();
  };

  public shared ({ caller }) func updateTask(
    id : TaskId,
    titel : Text,
    beschreibung : Text,
    gewerke : Text,
    status : Text,
    dringlichkeit : Nat,
    bereich : Bereich,
    faelligkeit : Time.Time,
    kategorie : Text,
    verantwortlicherKontakt : ?ContactId,
    projectId : ?ProjectId,
  ) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Run.trap("Unauthorized: Only users can update tasks");
    };
    let userTasks = getUserTasks(effectiveOwner(caller));
    switch (userTasks.get(id)) {
      case (null) {
        Run.trap("Task not found");
      };
      case (?existingTask) {
        if (existingTask.owner != caller and not AccessControl.isAdmin(accessControlState, caller)) {
          Run.trap("Unauthorized: You can only update your own tasks");
        };
        let updatedTask : Task = {
          id;
          titel;
          beschreibung;
          gewerke;
          status;
          dringlichkeit;
          bereich;
          faelligkeit;
          kategorie;
          verantwortlicherKontakt;
          projectId;
          owner = existingTask.owner;
        };
        userTasks.add(id, updatedTask);
      };
    };
  };

  public shared ({ caller }) func updateContact(
    id : ContactId,
    name : Text,
    firma : Text,
    rolle : Text,
    email : Text,
    telefon : Text,
    notizen : Text,
    verknuepfteTasks : [TaskId],
    verknuepfteDokumente : [DocumentId],
  ) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Run.trap("Unauthorized: Only users can update contacts");
    };
    let userContacts = getUserContacts(effectiveOwner(caller));
    switch (userContacts.get(id)) {
      case (null) {
        Run.trap("Contact not found");
      };
      case (?existingContact) {
        if (existingContact.owner != caller and not AccessControl.isAdmin(accessControlState, caller)) {
          Run.trap("Unauthorized: You can only update your own contacts");
        };
        let updatedContact : Contact = {
          id;
          name;
          firma;
          rolle;
          email;
          telefon;
          notizen;
          verknuepfteTasks;
          verknuepfteDokumente;
          owner = existingContact.owner;
        };
        userContacts.add(id, updatedContact);
      };
    };
  };

  public shared ({ caller }) func updateHelpfulLink(
    id : LinkId,
    titel : Text,
    beschreibung : Text,
    url : Text,
    kategorie : Text,
    logoUrl : Text,
  ) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Run.trap("Unauthorized: Only users can update links");
    };
    let userLinks = getUserLinks(effectiveOwner(caller));
    switch (userLinks.get(id)) {
      case (null) { Run.trap("Link not found") };
      case (?existingLink) {
        if (existingLink.owner != caller and not AccessControl.isAdmin(accessControlState, caller)) {
          Run.trap("Unauthorized: You can only update your own links");
        };
        let updatedLink : HelpfulLink = {
          id;
          titel;
          beschreibung;
          url;
          kategorie;
          logoUrl;
          owner = existingLink.owner;
        };
        userLinks.add(id, updatedLink);
      };
    };
  };

  public shared ({ caller }) func deleteTask(taskId : TaskId) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Run.trap("Unauthorized: Only users can delete tasks");
    };
    let userTasks = getUserTasks(effectiveOwner(caller));
    switch (userTasks.get(taskId)) {
      case (null) {
        Run.trap("Task not found");
      };
      case (?task) {
        if (task.owner != caller and not AccessControl.isAdmin(accessControlState, caller)) {
          Run.trap("Unauthorized: You can only delete your own tasks");
        };
        userTasks.remove(taskId);
      };
    };
  };

  public shared ({ caller }) func deleteContact(contactId : ContactId) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Run.trap("Unauthorized: Only users can delete contacts");
    };
    let userContacts = getUserContacts(effectiveOwner(caller));
    switch (userContacts.get(contactId)) {
      case (null) { Run.trap("Contact not found") };
      case (?contact) {
        if (contact.owner != caller and not AccessControl.isAdmin(accessControlState, caller)) {
          Run.trap("Unauthorized: You can only delete your own contacts");
        };
        userContacts.remove(contactId);
      };
    };
  };

  public shared ({ caller }) func deleteHelpfulLink(linkId : LinkId) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Run.trap("Unauthorized: Only users can delete links");
    };
    let userLinks = getUserLinks(effectiveOwner(caller));
    switch (userLinks.get(linkId)) {
      case (null) { Run.trap("Link not found") };
      case (?link) {
        if (link.owner != caller and not AccessControl.isAdmin(accessControlState, caller)) {
          Run.trap("Unauthorized: You can only delete your own links");
        };
        userLinks.remove(linkId);
      };
    };
  };

  public shared ({ caller }) func initializeAccessControl() : async () {
    AccessControl.initialize(accessControlState, caller);
  };

  public query ({ caller }) func getCallerUserRole() : async AccessControl.UserRole {
    AccessControl.getUserRole(accessControlState, caller);
  };

  public shared ({ caller }) func assignCallerUserRole(user : Principal, role : AccessControl.UserRole) : async () {
    AccessControl.assignRole(accessControlState, caller, user, role);
  };

  public query ({ caller }) func isCallerAdmin() : async Bool {
    AccessControl.isAdmin(accessControlState, caller);
  };

  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    // Return null for unregistered users instead of throwing, so new users can reach profile setup
    if (caller.isAnonymous()) { return null };
    switch (accessControlState.userRoles.get(caller)) {
      case (null) { return null };
      case (?_) {};
    };
    userProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Run.trap("Unauthorized: Can only view your own profile");
    };
    userProfiles.get(user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    // Auto-initialize new users so they can save their profile on first login
    AccessControl.initialize(accessControlState, caller);
    userProfiles.add(caller, profile);
  };

  public shared ({ caller }) func uploadMedia(
    id : Text,
    name : Text,
    kategorie : Text,
    typ : Text,
    position : Int,
    tags : [Text],
    blob : Storage.ExternalBlob,
    projectId : ?ProjectId,
  ) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Run.trap("Unauthorized: Only users can upload media");
    };
    let userMedia = getUserMediaInternal(effectiveOwner(caller));
    let mediaItem : Media = {
      id;
      name;
      kategorie;
      typ;
      position;
      tags;
      blob;
      owner = effectiveOwner(caller);
    };
    if (userMedia.containsKey(id)) {
      Run.trap("Medien-Duplikation: Medienobjekt mit dieser ID existiert bereits");
    };
    userMedia.add(id, mediaItem);
    // Store project association in separate map
    switch (projectId) {
      case (?pid) { mediaProjectMap.add(id, pid) };
      case (null) {};
    };
  };

  public shared ({ caller }) func bulkUpdateMediaPositions(updates : [MediaPositionUpdate]) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Run.trap("Unauthorized: Only users can update media positions");
    };
    let userMedia = getUserMediaInternal(effectiveOwner(caller));
    for (update in updates.values()) {
      switch (userMedia.get(update.mediaId)) {
        case (null) { Run.trap("Media with id " # update.mediaId # " not found") };
        case (?mediaItem) {
          if (mediaItem.owner != caller and not AccessControl.isAdmin(accessControlState, caller)) {
            Run.trap("Unauthorized: You can only update positions of your own media");
          };
          let updatedMedia = { mediaItem with position = update.newPosition };
          userMedia.add(update.mediaId, updatedMedia);
        };
      };
    };
  };

  public shared ({ caller }) func deleteUserMedia(mediaId : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Run.trap("Unauthorized: Only users can delete media");
    };
    let userMedia = getUserMediaInternal(effectiveOwner(caller));
    switch (userMedia.get(mediaId)) {
      case (null) {
        Run.trap("Media with id " # mediaId # " not found");
      };
      case (?mediaItem) {
        if (mediaItem.owner != caller and not AccessControl.isAdmin(accessControlState, caller)) {
          Run.trap("Unauthorized: You can only delete your own media");
        };
        userMedia.remove(mediaId);
      };
    };
  };

  public shared ({ caller }) func updateMedia(id : Text, updates : MediaUpdate) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Run.trap("Unauthorized: Only users can update media");
    };
    let userMedia = getUserMediaInternal(effectiveOwner(caller));
    switch (userMedia.get(id)) {
      case (null) {
        Run.trap("Media with id " # id # " not found");
      };
      case (?existingMedia) {
        if (existingMedia.owner != caller and not AccessControl.isAdmin(accessControlState, caller)) {
          Run.trap("Unauthorized: You can only update your own media");
        };
        let updatedMedia = {
          existingMedia with
          name = switch (updates.name) { case (?newName) { newName }; case (null) { existingMedia.name } };
          kategorie = switch (updates.kategorie) { case (?newKategorie) { newKategorie }; case (null) { existingMedia.kategorie } };
          typ = switch (updates.typ) { case (?newTyp) { newTyp }; case (null) { existingMedia.typ } };
          position = switch (updates.position) { case (?newPosition) { newPosition }; case (null) { existingMedia.position } };
          tags = switch (updates.tags) { case (?newTags) { newTags }; case (null) { existingMedia.tags } };
        };
        userMedia.add(id, updatedMedia);
      };
    };
  };

  public shared ({ caller }) func uploadDocumentWithPDF(
    id : Text,
    name : Text,
    bereich : Bereich,
    typ : Text,
    status : Text,
    blob : Storage.ExternalBlob,
    projectId : ?ProjectId,
  ) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Run.trap("Unauthorized: Only users can upload documents");
    };
    let userDocuments = getUserDocumentsInternal(effectiveOwner(caller));
    let document : Document = {
      id;
      name;
      bereich;
      typ;
      status;
      blob;
      owner = effectiveOwner(caller);
    };
    if (userDocuments.containsKey(id)) {
      Run.trap("Dokumenten-Duplikation: Dokument mit dieser ID existiert bereits");
    };
    userDocuments.add(id, document);
    // Store project association in separate map
    switch (projectId) {
      case (?pid) { documentProjectMap.add(id, pid) };
      case (null) {};
    };
  };

  public shared ({ caller }) func deleteDocument(documentId : DocumentId) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Run.trap("Unauthorized: Only users can delete documents");
    };
    let userDocuments = getUserDocumentsInternal(effectiveOwner(caller));
    switch (userDocuments.get(documentId)) {
      case (null) {
        Run.trap("Document not found");
      };
      case (?document) {
        if (document.owner != caller and not AccessControl.isAdmin(accessControlState, caller)) {
          Run.trap("Unauthorized: You can only delete your own documents");
        };
        userDocuments.remove(documentId);
      };
    };
  };

  public shared ({ caller }) func createProjekt(
    id : ProjectId,
    name : Text,
    kunde : ?Text,
    color : Text,
    start : ?Time.Time,
    end : ?Time.Time,
    kategorie : Text,
    verantwortlicherKontakt : ?ContactId,
    costItemsArray : [CostItem],
    parentProjectId : ?ProjectId,
  ) : async () {
    // Auto-initialize new users on first project creation
    AccessControl.initialize(accessControlState, caller);
    let userProjects = getUserProjects(effectiveOwner(caller));
    let userProfile = switch (userProfiles.get(caller)) {
      case (?profile) { ?profile };
      case (null) { null };
    };
    let validatedKunde = switch (userProfile, kunde) {
      case (?profile, _) {
        if (profile.userType == #privat) {
          profile.name;
        } else {
          switch (kunde) {
            case (?k) { k };
            case (_) { "Unbekannter Kunde" };
          };
        };
      };
      case (_) {
        switch (kunde) {
          case (?k) { k };
          case (_) { "Unbekannter Kunde" };
        };
      };
    };
    let projekt : Project = {
      id;
      name;
      kunde = validatedKunde;
      color;
      startDate = start;
      endDate = end;
      kategorie;
      verantwortlicherKontakt;
      parentProjectId;
      owner = effectiveOwner(caller);
    };
    if (userProjects.containsKey(id)) {
      Run.trap("Projekt mit dieser ID existiert bereits");
    };
    userProjects.add(id, projekt);

    let userCostItems = getUserCostItems(effectiveOwner(caller));
    let validatedCostItems = costItemsArray.map(func(item : CostItem) : CostItem {
      { item with owner = effectiveOwner(caller); projektId = id };
    });
    userCostItems.add(id, validatedCostItems);
  };

  public query ({ caller }) func getProjekt(id : ProjectId) : async Project {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Run.trap("Unauthorized: Only users can view projects");
    };
    let userProjects = getUserProjects(effectiveOwner(caller));
    switch (userProjects.get(id)) {
      case (null) {
        Run.trap("Kein Projekt mit dieser ID gefunden");
      };
      case (?projekt) {
        if (projekt.owner != effectiveOwner(caller) and not AccessControl.isAdmin(accessControlState, caller)) {
          Run.trap("Unauthorized: You can only view your own projects");
        };
        projekt;
      };
    };
  };

  public query ({ caller }) func getAllProjects() : async [Project] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Run.trap("Unauthorized: Only users can view projects");
    };
    getUserProjects(effectiveOwner(caller)).values().toArray();
  };

  public shared ({ caller }) func updateProjekt(
    id : ProjectId,
    name : Text,
    kunde : ?Text,
    color : Text,
    start : ?Time.Time,
    end : ?Time.Time,
    kategorie : Text,
    verantwortlicherKontakt : ?ContactId,
    costItemsArray : [CostItem],
  ) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Run.trap("Unauthorized: Only users can update projects");
    };
    let userProjects = getUserProjects(effectiveOwner(caller));
    switch (userProjects.get(id)) {
      case (null) {
        Run.trap("Kein Projekt mit dieser ID gefunden");
      };
      case (?existingProjekt) {
        if (existingProjekt.owner != effectiveOwner(caller) and not AccessControl.isAdmin(accessControlState, caller)) {
          Run.trap("Unauthorized: You can only update your own projects");
        };
        let userProfile = switch (userProfiles.get(caller)) {
          case (?profile) { ?profile };
          case (null) { null };
        };
        let validatedKunde = switch (userProfile, kunde) {
          case (?profile, _) {
            if (profile.userType == #privat) {
              profile.name;
            } else {
              switch (kunde) {
                case (?k) { k };
                case (_) { "Unbekannter Kunde" };
              };
            };
          };
          case (_) {
            switch (kunde) {
              case (?k) { k };
              case (_) { "Unbekannter Kunde" };
            };
          };
        };
        let updatedProjekt : Project = {
          id;
          name;
          kunde = validatedKunde;
          color;
          startDate = start;
          endDate = end;
          kategorie;
          verantwortlicherKontakt;
          parentProjectId = existingProjekt.parentProjectId;
          owner = existingProjekt.owner;
        };
        userProjects.add(id, updatedProjekt);

        let userCostItems = getUserCostItems(effectiveOwner(caller));
        let validatedCostItems = costItemsArray.map(func(item : CostItem) : CostItem {
          { item with owner = existingProjekt.owner; projektId = id };
        });
        userCostItems.add(id, validatedCostItems);
      };
    };
  };

  public shared ({ caller }) func deleteProjekt(id : ProjectId) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Run.trap("Unauthorized: Only users can delete projects");
    };
    let userProjects = getUserProjects(effectiveOwner(caller));
    switch (userProjects.get(id)) {
      case (null) {
        Run.trap("Kein Projekt mit dieser ID existiert bereits");
      };
      case (?projekt) {
        if (projekt.owner != effectiveOwner(caller) and not AccessControl.isAdmin(accessControlState, caller)) {
          Run.trap("Unauthorized: You can only delete your own projects");
        };
        userProjects.remove(id);
        let userCostItems = getUserCostItems(effectiveOwner(caller));
        userCostItems.remove(id);
      };
    };
  };

  public query ({ caller }) func getTopLevelProjects() : async [Project] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Run.trap("Unauthorized: Only users can access projects");
    };
    let userProjects = getUserProjects(effectiveOwner(caller));
    userProjects.values().toArray().filter(func(project) { project.parentProjectId == null });
  };

  public query ({ caller }) func getPhasesByProject(parentId : ProjectId) : async [Project] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Run.trap("Unauthorized: Only users can access projects");
    };
    let userProjects = getUserProjects(effectiveOwner(caller));
    switch (userProjects.get(parentId)) {
      case (null) {
        Run.trap("Parent project not found or unauthorized");
      };
      case (?parentProject) {
        if (parentProject.owner != effectiveOwner(caller) and not AccessControl.isAdmin(accessControlState, caller)) {
          Run.trap("Unauthorized: You can only view phases of your own projects");
        };
        userProjects.values().toArray().filter(
          func(project) {
            switch (project.parentProjectId) {
              case (?pid) { pid == parentId };
              case (_) { false };
            };
          }
        );
      };
    };
  };

  public shared ({ caller }) func addKostenpunkt(projectId : ProjectId, kost : CostItem) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Run.trap("Unauthorized: Only users can add cost items");
    };
    let userProjects = getUserProjects(effectiveOwner(caller));
    switch (userProjects.get(projectId)) {
      case (null) {
        Run.trap("Projekt nicht gefunden");
      };
      case (?projekt) {
        if (projekt.owner != effectiveOwner(caller) and not AccessControl.isAdmin(accessControlState, caller)) {
          Run.trap("Unauthorized: You can only add cost items to your own projects");
        };
        let userCostItems = getUserCostItems(effectiveOwner(caller));
        let kostWithOwner = { kost with owner = effectiveOwner(caller); projektId = projectId };
        let currentList = switch (userCostItems.get(projectId)) {
          case (null) { [kostWithOwner] };
          case (?existing) { existing.concat([kostWithOwner]) };
        };
        userCostItems.add(projectId, currentList);
      };
    };
  };

  public shared ({ caller }) func updateKostenpunkt(
    projectId : ProjectId,
    kostId : CostItemId,
    updatedKost : CostItem,
  ) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Run.trap("Unauthorized: Only users can update cost items");
    };
    let userProjects = getUserProjects(effectiveOwner(caller));
    switch (userProjects.get(projectId)) {
      case (null) {
        Run.trap("Projekt nicht gefunden");
      };
      case (?projekt) {
        if (projekt.owner != effectiveOwner(caller) and not AccessControl.isAdmin(accessControlState, caller)) {
          Run.trap("Unauthorized: You can only update cost items in your own projects");
        };
        let userCostItems = getUserCostItems(effectiveOwner(caller));
        switch (userCostItems.get(projectId)) {
          case (null) { Run.trap("Keine Kostenpunkte für dieses Projekt gefunden") };
          case (?koste) {
            let kostFound = koste.find(func(k) { k.id == kostId });
            switch (kostFound) {
              case (null) { Run.trap("Kostenpunkt nicht gefunden") };
              case (?existingKost) {
                if (existingKost.owner != effectiveOwner(caller) and not AccessControl.isAdmin(accessControlState, caller)) {
                  Run.trap("Unauthorized: You can only update your own cost items");
                };
                let newList = koste.map(
                  func(k) {
                    if (k.id == kostId) {
                      { updatedKost with owner = existingKost.owner; projektId = projectId };
                    } else { k };
                  }
                );
                userCostItems.add(projectId, newList);
              };
            };
          };
        };
      };
    };
  };

  public shared ({ caller }) func deleteKostenpunkt(projectId : ProjectId, kostenpunktId : CostItemId) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Run.trap("Unauthorized: Only users can delete cost items");
    };
    let userProjects = getUserProjects(effectiveOwner(caller));
    switch (userProjects.get(projectId)) {
      case (null) {
        Run.trap("Projekt nicht gefunden");
      };
      case (?projekt) {
        if (projekt.owner != effectiveOwner(caller) and not AccessControl.isAdmin(accessControlState, caller)) {
          Run.trap("Unauthorized: You can only delete cost items from your own projects");
        };
        let userCostItems = getUserCostItems(effectiveOwner(caller));
        switch (userCostItems.get(projectId)) {
          case (null) { Run.trap("Keine Kostenpunkte für dieses Projekt gefunden") };
          case (?koste) {
            let foundItem = koste.find(func(item) { item.id == kostenpunktId });
            switch (foundItem) {
              case (null) {
                Run.trap("Kostenpunkt nicht gefunden");
              };
              case (?item) {
                if (item.owner != caller and not AccessControl.isAdmin(accessControlState, caller)) {
                  Run.trap("Unauthorized: You can only delete your own cost items");
                };
                let filteredCosts = koste.filter(func(item) { item.id != kostenpunktId });
                if (filteredCosts.size() == 0) {
                  userCostItems.remove(projectId);
                } else {
                  userCostItems.add(projectId, filteredCosts);
                };
              };
            };
          };
        };
      };
    };
  };

  public query ({ caller }) func getKostenpunkteByProjekt(projectId : ProjectId) : async [CostItem] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Run.trap("Unauthorized: Only users can view cost items");
    };
    let userProjects = getUserProjects(effectiveOwner(caller));
    switch (userProjects.get(projectId)) {
      case (null) {
        Run.trap("Projekt nicht gefunden oder keine Berechtigung");
      };
      case (?projekt) {
        if (projekt.owner != effectiveOwner(caller) and not AccessControl.isAdmin(accessControlState, caller)) {
          Run.trap("Unauthorized: You can only view cost items from your own projects");
        };
        let userCostItems = getUserCostItems(effectiveOwner(caller));
        switch (userCostItems.get(projectId)) {
          case (null) { [] };
          case (?koste) { koste };
        };
      };
    };
  };


  public query ({ caller }) func getKostenpunkteByProjectAndPhases(projectId : ProjectId) : async [CostItem] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Run.trap("Unauthorized: Only users can view cost items");
    };
    let userProjects = getUserProjects(effectiveOwner(caller));
    switch (userProjects.get(projectId)) {
      case (null) {
        Run.trap("Projekt nicht gefunden oder keine Berechtigung");
      };
      case (?parentProject) {
        if (parentProject.owner != caller and not AccessControl.isAdmin(accessControlState, caller)) {
          Run.trap("Unauthorized: You can only view cost items from your own projects");
        };
        let userCostItems = getUserCostItems(effectiveOwner(caller));
        let phases = userProjects.values().toArray().filter(
          func(project) {
            switch (project.parentProjectId) {
              case (?pid) { pid == projectId };
              case (_) { false };
            };
          }
        );
        let projectItems = switch (userCostItems.get(projectId)) {
          case (?items) { items };
          case (null) { [] };
        };
        let phaseItemArrays = phases.map(func(phase : Project) : [CostItem] {
          switch (userCostItems.get(phase.id)) {
            case (?items) { items };
            case (null) { [] };
          };
        });
        let phaseItems = phaseItemArrays.flatten();
        projectItems.concat(phaseItems);
      };
    };
  };

  public query ({ caller }) func getAllKostenpunkte() : async [CostItem] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Run.trap("Unauthorized: Only users can view cost items");
    };
    let userCostItems = getUserCostItems(effectiveOwner(caller));
    let allCostArrays = userCostItems.values().toArray();
    allCostArrays.flatten();
  };

  public type KostenUebersicht = {
    gesamt : Float;
    bezahlt : Float;
    offen : Float;
  };

  public query ({ caller }) func getKostenUebersicht(projektId : ?ProjectId) : async KostenUebersicht {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Run.trap("Unauthorized: Only users can view costs summary");
    };
    let userCostItems = getUserCostItems(effectiveOwner(caller));
    switch (projektId) {
      case (?pid) {
        let userProjects = getUserProjects(effectiveOwner(caller));
        switch (userProjects.get(pid)) {
          case (null) {
            Run.trap("Projekt nicht gefunden oder keine Berechtigung");
          };
          case (?projekt) {
            if (projekt.owner != effectiveOwner(caller) and not AccessControl.isAdmin(accessControlState, caller)) {
              Run.trap("Unauthorized: You can only view cost summary for your own projects");
            };
            switch (userCostItems.get(pid)) {
              case (null) {
                { gesamt = 0.0; bezahlt = 0.0; offen = 0.0 };
              };
              case (?koste) {
                let sum = koste.foldLeft(0.0, func(acc, k) { acc + k.betrag });
                let paidSum = koste.foldLeft(
                  0.0,
                  func(acc, k) {
                    if (k.status == "bezahlt") { acc + k.betrag } else { acc };
                  },
                );
                {
                  gesamt = sum;
                  bezahlt = paidSum;
                  offen = sum - paidSum;
                };
              };
            };
          };
        };
      };
      case (null) {
        let allCostArrays = userCostItems.values().toArray();
        let allCosts = allCostArrays.flatten();
        let sum = allCosts.foldLeft(0.0, func(acc, k) { acc + k.betrag });
        let paidSum = allCosts.foldLeft(
          0.0,
          func(acc, k) {
            if (k.status == "bezahlt") { acc + k.betrag } else { acc };
          },
        );
        {
          gesamt = sum;
          bezahlt = paidSum;
          offen = sum - paidSum;
        };
      };
    };
  };

  public query ({ caller }) func filterProjectsByUserType(userType : UserType) : async [Project] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Run.trap("Unauthorized: Only users can filter projects");
    };
    switch (userProfiles.get(caller)) {
      case (?profile) {
        if (profile.userType == userType) {
          getUserProjects(effectiveOwner(caller)).values().toArray();
        } else {
          [];
        };
      };
      case (null) { [] };
    };
  };

  public query ({ caller }) func getUserMedia() : async [Media] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Run.trap("Unauthorized: Only users can view media");
    };
    getUserMediaInternal(effectiveOwner(caller)).values().toArray();
  };

  public query ({ caller }) func getUserDocuments() : async [Document] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Run.trap("Unauthorized: Only users can view documents");
    };
    getUserDocumentsInternal(effectiveOwner(caller)).values().toArray();
  };


  public query ({ caller }) func getTasksByProject(projectId : ProjectId) : async [Task] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Run.trap("Unauthorized: Only users can view tasks");
    };
    let userTasks = getUserTasks(effectiveOwner(caller));
    userTasks.values().toArray().filter(
      func(task) {
        switch (task.projectId) {
          case (?pid) { pid == projectId };
          case (null) { false };
        };
      }
    );
  };

  public query ({ caller }) func getDocumentsByProject(projectId : ProjectId) : async [Document] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Run.trap("Unauthorized: Only users can view documents");
    };
    let userDocuments = getUserDocumentsInternal(effectiveOwner(caller));
    userDocuments.values().toArray().filter(
      func(doc) {
        switch (documentProjectMap.get(doc.id)) {
          case (?pid) { pid == projectId };
          case (null) { false };
        };
      }
    );
  };

  public query ({ caller }) func getMediaByProject(projectId : ProjectId) : async [Media] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Run.trap("Unauthorized: Only users can view media");
    };
    let userMedia = getUserMediaInternal(effectiveOwner(caller));
    userMedia.values().toArray().filter(
      func(m) {
        switch (mediaProjectMap.get(m.id)) {
          case (?pid) { pid == projectId };
          case (null) { false };
        };
      }
    );
  };

  public shared ({ caller }) func createInviteToken(role : AccessControl.UserRole) : async InviteToken {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Run.trap("Unauthorized: Only admins can create invite tokens");
    };
    let token = createRandomToken();
    inviteTokens.add(token, ?role);
    inviteOwners.add(token, caller);
    token;
  };

  public shared ({ caller }) func claimInviteToken(token : InviteToken) : async () {
    switch (inviteTokens.get(token)) {
      case (null) {
        Run.trap("Invalid or expired token");
      };
      case (?roleOpt) {
        switch (roleOpt) {
          case (null) {
            Run.trap("Token already used");
          };
          case (?role) {
            // Directly assign role (token already validated by admin creation)
            accessControlState.userRoles.add(caller, role);
            teamMembers.add(caller, role);
            // Record that this user shares data with the inviter
            switch (inviteOwners.get(token)) {
              case (?inviterPrincipal) {
                projectSharing.add(caller, inviterPrincipal);
              };
              case (null) {};
            };
            inviteTokens.add(token, null);
          };
        };
      };
    };
  };

  public query ({ caller }) func listTeamMembers() : async [TeamMember] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Run.trap("Unauthorized: Only admins can view team members");
    };
    let members = teamMembers.entries().toArray();
    members.map(func((principal, role)) : TeamMember {
      { principal = principal; role = role };
    });
  };

  public shared ({ caller }) func updateTeamMemberRole(principal : Principal, role : AccessControl.UserRole) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Run.trap("Unauthorized: Only admins can update team member roles");
    };
    AccessControl.assignRole(accessControlState, caller, principal, role);
    teamMembers.add(principal, role);
  };

  public shared ({ caller }) func removeTeamMember(principal : Principal) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Run.trap("Unauthorized: Only admins can remove team members");
    };
    teamMembers.remove(principal);
  };

  func createRandomToken() : Text {
    let timestamp = Time.now();
    "token_" # timestamp.toText();
  };

  public shared ({ caller }) func generateInviteCode() : async Text {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Run.trap("Unauthorized: Only admins can generate invite codes");
    };
    let blob = await Random.blob();
    let code = InviteLinksModule.generateUUID(blob);
    InviteLinksModule.generateInviteCode(inviteState, code);
    code;
  };

  public shared func submitRSVP(name : Text, attending : Bool, inviteCode : Text) : async () {
    InviteLinksModule.submitRSVP(inviteState, name, attending, inviteCode);
  };

  public query ({ caller }) func getAllRSVPs() : async [InviteLinksModule.RSVP] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Run.trap("Unauthorized: Only admins can view RSVPs");
    };
    InviteLinksModule.getAllRSVPs(inviteState);
  };

  public query ({ caller }) func getInviteCodes() : async [InviteLinksModule.InviteCode] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Run.trap("Unauthorized: Only admins can view invite codes");
    };
    InviteLinksModule.getInviteCodes(inviteState);
  };

  public shared ({ caller }) func createInvite(
    generatedCode : Text,
    role : AccessControl.UserRole,
  ) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Run.trap("Unauthorized: Only admins can generate invite codes");
    };
    if (codesMap.containsKey(generatedCode)) {
      Run.trap("Invite code already exists");
    };
    let code = { code = generatedCode; role };
    codesMap.add(generatedCode, code);
  };

  public shared ({ caller }) func validateInviteCode(generatedCode : Text) : async () {
    switch (codesMap.get(generatedCode)) {
      case (null) {
        Run.trap("Invalid or expired code");
      };
      case (?code) {
        codesMap.remove(generatedCode);
        AccessControl.assignRole(accessControlState, caller, caller, code.role);
        teamMembers.add(caller, code.role);
      };
    };
  };

  public query ({ caller }) func getInviteCode(generatedCode : Text) : async ?InviteCode {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Run.trap("Unauthorized: Only admins can view invite code details");
    };
    codesMap.get(generatedCode);
  };

  public query ({ caller }) func getAllUserProjects() : async [(ProjectId, Project)] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Run.trap("Unauthorized: Only users can view projects");
    };
    let userProjects = getUserProjects(effectiveOwner(caller));
    userProjects.toArray();
  };
};
