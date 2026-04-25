import { useParams } from "react-router-dom";

const ListingDetail = () => {
  const { id } = useParams();
  return (
    <section className="py-8">
      <h1 className="text-2xl font-semibold tracking-tight">Listing detail</h1>
      <p className="mt-2 text-muted-foreground">Listing #{id} — gallery, seller card, contact coming next.</p>
    </section>
  );
};

export default ListingDetail;