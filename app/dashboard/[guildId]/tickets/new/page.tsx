import TicketPanelForm from "../TicketPanelForm";

type PageProps = {
  params: Promise<{
    guildId: string;
  }>;
};

export default async function NewTicketPanelPage({ params }: PageProps) {
  const { guildId } = await params;

  return <TicketPanelForm guildId={guildId} mode="create" />;
}
