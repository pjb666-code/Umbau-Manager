import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Building2,
  ExternalLink,
  Link as LinkIcon,
  Mail,
  Pencil,
  Phone,
  Plus,
  Search,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import TeamTab from "../components/team/TeamTab";
import {
  useCreateContact,
  useCreateLink,
  useDeleteContact,
  useDeleteLink,
  useGetAllContacts,
  useGetAllLinks,
  useUpdateContact,
  useUpdateLink,
} from "../hooks/useQueries";
import type { HilfreicherLink, Kontakt } from "../hooks/useQueries";

const CONTACT_ROLES = [
  "Architekt",
  "Bauunternehmer",
  "Elektriker",
  "Sanitär",
  "Heizung",
  "Maler",
  "Zimmermann",
  "Sonstiges",
];
const LINK_CATEGORIES = [
  "Behörden",
  "Lieferanten",
  "Handwerker",
  "Planung",
  "Finanzen",
  "Sonstiges",
];

export default function Contacts() {
  const { data: contacts = [], isLoading: contactsLoading } =
    useGetAllContacts();
  const { data: links = [], isLoading: linksLoading } = useGetAllLinks();
  const createContact = useCreateContact();
  const updateContact = useUpdateContact();
  const deleteContact = useDeleteContact();
  const createLink = useCreateLink();
  const updateLink = useUpdateLink();
  const deleteLink = useDeleteLink();

  const [isContactDialogOpen, setIsContactDialogOpen] = useState(false);
  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Kontakt | null>(null);
  const [editingLink, setEditingLink] = useState<HilfreicherLink | null>(null);
  const [deleteContactId, setDeleteContactId] = useState<string | null>(null);
  const [deleteLinkId, setDeleteLinkId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const [newContact, setNewContact] = useState({
    name: "",
    firma: "",
    rolle: "",
    email: "",
    telefon: "",
    notizen: "",
  });

  const [newLink, setNewLink] = useState({
    titel: "",
    beschreibung: "",
    url: "",
    kategorie: "",
    logoUrl: "",
  });

  const filteredContacts = useMemo(() => {
    return contacts.filter((contact) => {
      const matchesSearch =
        searchTerm === "" ||
        contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contact.firma.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contact.rolle.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesRole = roleFilter === "all" || contact.rolle === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [contacts, searchTerm, roleFilter]);

  const filteredLinks = useMemo(() => {
    return links.filter((link) => {
      const matchesSearch =
        searchTerm === "" ||
        link.titel.toLowerCase().includes(searchTerm.toLowerCase()) ||
        link.beschreibung.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory =
        categoryFilter === "all" || link.kategorie === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [links, searchTerm, categoryFilter]);

  const handleCreateContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContact.name.trim() || !newContact.rolle) {
      toast.error("Bitte füllen Sie Name und Rolle aus");
      return;
    }

    const contactId = `contact_${Date.now()}`;
    try {
      await createContact.mutateAsync({
        id: contactId,
        ...newContact,
      });
      setNewContact({
        name: "",
        firma: "",
        rolle: "",
        email: "",
        telefon: "",
        notizen: "",
      });
      setIsContactDialogOpen(false);
    } catch (error) {
      console.error("Create contact error:", error);
    }
  };

  const handleUpdateContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingContact || !newContact.name.trim() || !newContact.rolle) {
      toast.error("Bitte füllen Sie Name und Rolle aus");
      return;
    }

    try {
      await updateContact.mutateAsync({
        id: editingContact.id,
        ...newContact,
      });
      setNewContact({
        name: "",
        firma: "",
        rolle: "",
        email: "",
        telefon: "",
        notizen: "",
      });
      setEditingContact(null);
      setIsContactDialogOpen(false);
    } catch (error) {
      console.error("Update contact error:", error);
    }
  };

  const handleDeleteContact = async () => {
    if (!deleteContactId) return;
    try {
      await deleteContact.mutateAsync(deleteContactId);
      setDeleteContactId(null);
    } catch (error) {
      console.error("Delete contact error:", error);
    }
  };

  const handleCreateLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLink.titel.trim() || !newLink.url.trim() || !newLink.kategorie) {
      toast.error("Bitte füllen Sie Titel, URL und Kategorie aus");
      return;
    }

    const linkId = `link_${Date.now()}`;
    try {
      await createLink.mutateAsync({
        id: linkId,
        ...newLink,
      });
      setNewLink({
        titel: "",
        beschreibung: "",
        url: "",
        kategorie: "",
        logoUrl: "",
      });
      setIsLinkDialogOpen(false);
    } catch (error) {
      console.error("Create link error:", error);
    }
  };

  const handleUpdateLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !editingLink ||
      !newLink.titel.trim() ||
      !newLink.url.trim() ||
      !newLink.kategorie
    ) {
      toast.error("Bitte füllen Sie Titel, URL und Kategorie aus");
      return;
    }

    try {
      await updateLink.mutateAsync({
        id: editingLink.id,
        ...newLink,
      });
      setNewLink({
        titel: "",
        beschreibung: "",
        url: "",
        kategorie: "",
        logoUrl: "",
      });
      setEditingLink(null);
      setIsLinkDialogOpen(false);
    } catch (error) {
      console.error("Update link error:", error);
    }
  };

  const handleDeleteLink = async () => {
    if (!deleteLinkId) return;
    try {
      await deleteLink.mutateAsync(deleteLinkId);
      setDeleteLinkId(null);
    } catch (error) {
      console.error("Delete link error:", error);
    }
  };

  const openEditContact = (contact: Kontakt) => {
    setEditingContact(contact);
    setNewContact({
      name: contact.name,
      firma: contact.firma,
      rolle: contact.rolle,
      email: contact.email,
      telefon: contact.telefon,
      notizen: contact.notizen,
    });
    setIsContactDialogOpen(true);
  };

  const openEditLink = (link: HilfreicherLink) => {
    setEditingLink(link);
    setNewLink({
      titel: link.titel,
      beschreibung: link.beschreibung,
      url: link.url,
      kategorie: link.kategorie,
      logoUrl: link.logoUrl,
    });
    setIsLinkDialogOpen(true);
  };

  const closeContactDialog = () => {
    setIsContactDialogOpen(false);
    setEditingContact(null);
    setNewContact({
      name: "",
      firma: "",
      rolle: "",
      email: "",
      telefon: "",
      notizen: "",
    });
  };

  const closeLinkDialog = () => {
    setIsLinkDialogOpen(false);
    setEditingLink(null);
    setNewLink({
      titel: "",
      beschreibung: "",
      url: "",
      kategorie: "",
      logoUrl: "",
    });
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Kontakte & Links
          </h1>
          <p className="text-muted-foreground mt-2">
            Verwalten Sie Ihre Kontakte, Links und Team-Mitglieder
          </p>
        </div>
      </div>

      <Tabs defaultValue="contacts" className="space-y-6">
        <TabsList className="grid w-full max-w-2xl grid-cols-3">
          <TabsTrigger value="contacts">
            <Users className="h-4 w-4 mr-2" />
            Kontakte
          </TabsTrigger>
          <TabsTrigger value="links">
            <LinkIcon className="h-4 w-4 mr-2" />
            Hilfreiche Links
          </TabsTrigger>
          <TabsTrigger value="team">
            <UserPlus className="h-4 w-4 mr-2" />
            Team
          </TabsTrigger>
        </TabsList>

        {/* Contacts Tab */}
        <TabsContent value="contacts" className="space-y-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Kontakte durchsuchen..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Rolle filtern" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Rollen</SelectItem>
                {CONTACT_ROLES.map((role) => (
                  <SelectItem key={role} value={role}>
                    {role}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Dialog
              open={isContactDialogOpen}
              onOpenChange={setIsContactDialogOpen}
            >
              <DialogTrigger asChild>
                <Button onClick={() => setEditingContact(null)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Kontakt hinzufügen
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>
                    {editingContact ? "Kontakt bearbeiten" : "Neuer Kontakt"}
                  </DialogTitle>
                  <DialogDescription>
                    {editingContact
                      ? "Bearbeiten Sie die Kontaktinformationen"
                      : "Fügen Sie einen neuen Kontakt hinzu"}
                  </DialogDescription>
                </DialogHeader>
                <form
                  onSubmit={
                    editingContact ? handleUpdateContact : handleCreateContact
                  }
                  className="space-y-4"
                >
                  <div className="space-y-2">
                    <Label htmlFor="name">Name *</Label>
                    <Input
                      id="name"
                      value={newContact.name}
                      onChange={(e) =>
                        setNewContact({ ...newContact, name: e.target.value })
                      }
                      placeholder="z.B. Max Mustermann"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="firma">Firma</Label>
                    <Input
                      id="firma"
                      value={newContact.firma}
                      onChange={(e) =>
                        setNewContact({ ...newContact, firma: e.target.value })
                      }
                      placeholder="z.B. Mustermann GmbH"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="rolle">Rolle *</Label>
                    <Select
                      value={newContact.rolle}
                      onValueChange={(value) =>
                        setNewContact({ ...newContact, rolle: value })
                      }
                    >
                      <SelectTrigger id="rolle">
                        <SelectValue placeholder="Rolle wählen..." />
                      </SelectTrigger>
                      <SelectContent>
                        {CONTACT_ROLES.map((role) => (
                          <SelectItem key={role} value={role}>
                            {role}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">E-Mail</Label>
                    <Input
                      id="email"
                      type="email"
                      value={newContact.email}
                      onChange={(e) =>
                        setNewContact({ ...newContact, email: e.target.value })
                      }
                      placeholder="max@beispiel.de"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="telefon">Telefon</Label>
                    <Input
                      id="telefon"
                      type="tel"
                      value={newContact.telefon}
                      onChange={(e) =>
                        setNewContact({
                          ...newContact,
                          telefon: e.target.value,
                        })
                      }
                      placeholder="+49 123 456789"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="notizen">Notizen</Label>
                    <Textarea
                      id="notizen"
                      value={newContact.notizen}
                      onChange={(e) =>
                        setNewContact({
                          ...newContact,
                          notizen: e.target.value,
                        })
                      }
                      placeholder="Zusätzliche Informationen..."
                      rows={3}
                    />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={closeContactDialog}
                    >
                      Abbrechen
                    </Button>
                    <Button
                      type="submit"
                      disabled={
                        createContact.isPending || updateContact.isPending
                      }
                    >
                      {editingContact ? "Aktualisieren" : "Hinzufügen"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {contactsLoading ? (
            <div className="text-center py-12 text-muted-foreground">
              Lade Kontakte...
            </div>
          ) : filteredContacts.length === 0 ? (
            <Card>
              <CardContent className="py-12">
                <div className="text-center text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Keine Kontakte gefunden</p>
                  <p className="text-sm mt-2">
                    {searchTerm || roleFilter !== "all"
                      ? "Versuchen Sie andere Suchkriterien"
                      : "Fügen Sie Ihren ersten Kontakt hinzu"}
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredContacts.map((contact) => (
                <Card
                  key={contact.id}
                  className="hover:shadow-md transition-shadow"
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg truncate">
                          {contact.name}
                        </CardTitle>
                        <CardDescription className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary">{contact.rolle}</Badge>
                        </CardDescription>
                      </div>
                      <div className="flex gap-1 ml-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditContact(contact)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteContactId(contact.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {contact.firma && (
                      <div className="flex items-center gap-2 text-sm">
                        <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="truncate">{contact.firma}</span>
                      </div>
                    )}
                    {contact.email && (
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                        <a
                          href={`mailto:${contact.email}`}
                          className="truncate hover:underline text-primary"
                        >
                          {contact.email}
                        </a>
                      </div>
                    )}
                    {contact.telefon && (
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                        <a
                          href={`tel:${contact.telefon}`}
                          className="truncate hover:underline text-primary"
                        >
                          {contact.telefon}
                        </a>
                      </div>
                    )}
                    {contact.notizen && (
                      <p className="text-sm text-muted-foreground mt-3 line-clamp-2">
                        {contact.notizen}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Links Tab */}
        <TabsContent value="links" className="space-y-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Links durchsuchen..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Kategorie filtern" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Kategorien</SelectItem>
                {LINK_CATEGORIES.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Dialog open={isLinkDialogOpen} onOpenChange={setIsLinkDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => setEditingLink(null)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Link hinzufügen
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>
                    {editingLink ? "Link bearbeiten" : "Neuer Link"}
                  </DialogTitle>
                  <DialogDescription>
                    {editingLink
                      ? "Bearbeiten Sie die Link-Informationen"
                      : "Fügen Sie einen neuen hilfreichen Link hinzu"}
                  </DialogDescription>
                </DialogHeader>
                <form
                  onSubmit={editingLink ? handleUpdateLink : handleCreateLink}
                  className="space-y-4"
                >
                  <div className="space-y-2">
                    <Label htmlFor="titel">Titel *</Label>
                    <Input
                      id="titel"
                      value={newLink.titel}
                      onChange={(e) =>
                        setNewLink({ ...newLink, titel: e.target.value })
                      }
                      placeholder="z.B. Bauamt München"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="url">URL *</Label>
                    <Input
                      id="url"
                      type="url"
                      value={newLink.url}
                      onChange={(e) =>
                        setNewLink({ ...newLink, url: e.target.value })
                      }
                      placeholder="https://beispiel.de"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="kategorie">Kategorie *</Label>
                    <Select
                      value={newLink.kategorie}
                      onValueChange={(value) =>
                        setNewLink({ ...newLink, kategorie: value })
                      }
                    >
                      <SelectTrigger id="kategorie">
                        <SelectValue placeholder="Kategorie wählen..." />
                      </SelectTrigger>
                      <SelectContent>
                        {LINK_CATEGORIES.map((category) => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="beschreibung">Beschreibung</Label>
                    <Textarea
                      id="beschreibung"
                      value={newLink.beschreibung}
                      onChange={(e) =>
                        setNewLink({ ...newLink, beschreibung: e.target.value })
                      }
                      placeholder="Kurze Beschreibung..."
                      rows={3}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="logoUrl">Logo URL (optional)</Label>
                    <Input
                      id="logoUrl"
                      type="url"
                      value={newLink.logoUrl}
                      onChange={(e) =>
                        setNewLink({ ...newLink, logoUrl: e.target.value })
                      }
                      placeholder="https://beispiel.de/logo.png"
                    />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={closeLinkDialog}
                    >
                      Abbrechen
                    </Button>
                    <Button
                      type="submit"
                      disabled={createLink.isPending || updateLink.isPending}
                    >
                      {editingLink ? "Aktualisieren" : "Hinzufügen"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {linksLoading ? (
            <div className="text-center py-12 text-muted-foreground">
              Lade Links...
            </div>
          ) : filteredLinks.length === 0 ? (
            <Card>
              <CardContent className="py-12">
                <div className="text-center text-muted-foreground">
                  <LinkIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Keine Links gefunden</p>
                  <p className="text-sm mt-2">
                    {searchTerm || categoryFilter !== "all"
                      ? "Versuchen Sie andere Suchkriterien"
                      : "Fügen Sie Ihren ersten Link hinzu"}
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredLinks.map((link) => (
                <Card
                  key={link.id}
                  className="hover:shadow-md transition-shadow"
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg truncate">
                          {link.titel}
                        </CardTitle>
                        <CardDescription className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary">{link.kategorie}</Badge>
                        </CardDescription>
                      </div>
                      <div className="flex gap-1 ml-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditLink(link)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteLinkId(link.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {link.beschreibung && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {link.beschreibung}
                      </p>
                    )}
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-primary hover:underline"
                    >
                      <ExternalLink className="h-4 w-4 shrink-0" />
                      <span className="truncate">{link.url}</span>
                    </a>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Team Tab */}
        <TabsContent value="team" className="space-y-6">
          <TeamTab />
        </TabsContent>
      </Tabs>

      {/* Delete Contact Confirmation */}
      <AlertDialog
        open={!!deleteContactId}
        onOpenChange={(open) => !open && setDeleteContactId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Kontakt löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Sind Sie sicher, dass Sie diesen Kontakt löschen möchten? Diese
              Aktion kann nicht rückgängig gemacht werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteContact}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Link Confirmation */}
      <AlertDialog
        open={!!deleteLinkId}
        onOpenChange={(open) => !open && setDeleteLinkId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Link löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Sind Sie sicher, dass Sie diesen Link löschen möchten? Diese
              Aktion kann nicht rückgängig gemacht werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteLink}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
