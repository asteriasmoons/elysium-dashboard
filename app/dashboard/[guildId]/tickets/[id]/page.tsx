import TicketPanelForm from "../TicketPanelForm";

type PageProps = {
  params: Promise<{
    guildId: string;
    id: string;
  }>;
};

async function getPanel(guildId: string, id: string) {
  const res = await fetch(
    `/api/tickets/${id}?guildId=${guildId}`,
    {
      cache: "no-store",
    },
  );

  if (!res.ok) {
    return null;
  }

  return res.json();
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
