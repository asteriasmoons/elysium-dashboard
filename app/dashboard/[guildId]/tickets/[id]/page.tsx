import TicketPanelForm from "../TicketPanelForm";
import { getTicketPanelById } from "@/lib/ticketAccess";

type PageProps = {
  params: Promise<{
    guildId: string;
    id: string;
  }>;
};

async function getPanel(guildId: string, id: string) {
  const panel = await getTicketPanelById(guildId, id);

  if (!panel) {
    return null;
  }

  return {
    _id: String(panel._id),
    guildId: panel.guildId,
    panelName: panel.panelName,
    creatorId: panel.creatorId,
    emoji: panel.emoji ?? null,
    greeting: panel.greeting ?? "",
    postChannelId: panel.postChannelId,
    ticketCategoryId: panel.ticketCategoryId,
    transcriptsEnabled: Boolean(panel.transcriptsEnabled),
    transcriptChannelId: panel.transcriptChannelId ?? null,
    roleToPing: panel.roleToPing ?? null,
    embed: panel.embed,
    greetingEmbed: panel.greetingEmbed ?? null,
    modalFields: Array.isArray(panel.modalFields) ? panel.modalFields : [],
    createdAt: panel.createdAt ? new Date(panel.createdAt).toISOString() : null,
    updatedAt: panel.updatedAt ? new Date(panel.updatedAt).toISOString() : null,
  };
}

export default async function EditTicketPanelPage({ params }: PageProps) {
  const { guildId, id } = await params;

  const panel = await getPanel(guildId, id);

  if (!panel) {
    return null;
  }

  return (
    <TicketPanelForm
      guildId={guildId}
      mode="edit"
      panelId={id}
      initialPanel={panel}
    />
  );
}
