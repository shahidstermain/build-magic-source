import { useParams } from "react-router-dom";

const ChatRoom = () => {
  const { id } = useParams();
  return (
    <section className="py-8">
      <h1 className="text-2xl font-semibold tracking-tight">Chat #{id}</h1>
      <p className="mt-2 text-muted-foreground">Realtime messaging coming next.</p>
    </section>
  );
};

export default ChatRoom;