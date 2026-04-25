import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Loader2, MapPin, Search, SlidersHorizontal } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ANDAMAN_AREAS, CATEGORIES, formatPrice } from "@/lib/listings";
import { slang } from "@/lib/slang";

type ListingRow = {
  id: string;
  title: string;
  price: number;
  area: string | null;
  city: string;
  category: string;
  condition: string;
  created_at: string;
  listing_images: { image_url: string; display_order: number }[];
};

const Listings = () => {
  const [params, setParams] = useSearchParams();
  const [items, setItems] = useState<ListingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(params.get("q") ?? "");
  const { toast } = useToast();

  const category = params.get("category") ?? "all";
  const area = params.get("area") ?? "all";
  const sort = params.get("sort") ?? "new";

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      let q = supabase
        .from("listings")
        .select("id, title, price, area, city, category, condition, created_at, listing_images(image_url, display_order)")
        .eq("status", "active");

      if (category !== "all") q = q.eq("category", category);
      if (area !== "all") q = q.eq("area", area);
      if (params.get("q")) q = q.ilike("title", `%${params.get("q")}%`);

      if (sort === "price_asc") q = q.order("price", { ascending: true });
      else if (sort === "price_desc") q = q.order("price", { ascending: false });
      else q = q.order("created_at", { ascending: false });

      const { data, error } = await q.limit(60);
      if (cancelled) return;
      if (error) {
        toast({ title: "Could not load listings", description: error.message, variant: "destructive" });
        setItems([]);
      } else {
        setItems((data as ListingRow[]) ?? []);
      }
      setLoading(false);
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [category, area, sort, params, toast]);

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value === "all" || !value) next.delete(key);
    else next.set(key, value);
    setParams(next);
  };

  const onSubmitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setParam("q", search.trim());
  };

  const activeFilters = useMemo(
    () => [category !== "all" && category, area !== "all" && area].filter(Boolean) as string[],
    [category, area],
  );

  return (
    <section className="py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Browse listings</h1>
        <Link to="/sell" className="text-sm font-medium text-primary hover:underline">
          + Post your own
        </Link>
      </div>

      <form onSubmit={onSubmitSearch} className="mt-4 flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search the islands…"
            className="pl-9"
          />
        </div>
        <Sheet>
          <SheetTrigger asChild>
            <Button type="button" variant="outline" size="icon" className="md:hidden">
              <SlidersHorizontal className="h-4 w-4" />
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="rounded-t-2xl">
            <SheetHeader className="text-left">
              <SheetTitle>Filters</SheetTitle>
            </SheetHeader>
            <div className="mt-4 space-y-4">
              <FilterControls
                category={category}
                area={area}
                sort={sort}
                onChange={setParam}
              />
            </div>
          </SheetContent>
        </Sheet>
        <Button type="submit" className="hidden sm:inline-flex">Search</Button>
      </form>

      <div className="mt-4 hidden flex-wrap gap-3 md:flex">
        <FilterControls category={category} area={area} sort={sort} onChange={setParam} />
      </div>

      {activeFilters.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {activeFilters.map((f) => (
            <Badge key={f} variant="secondary" className="capitalize">{f}</Badge>
          ))}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : items.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-border bg-card p-10 text-center">
          <p className="text-muted-foreground">
            {slang("browseEmpty", `${category}-${area}`)}
          </p>
          <Link to="/sell" className="mt-3 inline-block font-medium text-primary hover:underline">
            Be the first to post →
          </Link>
        </div>
      ) : (
        <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((item) => {
            const cover =
              [...item.listing_images].sort((a, b) => a.display_order - b.display_order)[0]?.image_url;
            return (
              <li key={item.id}>
                <Link
                  to={`/listings/${item.id}`}
                  className="group block overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-card)] transition-shadow hover:shadow-[var(--shadow-elevated)]"
                >
                  <div className="aspect-square w-full overflow-hidden bg-muted">
                    {cover ? (
                      <img
                        src={cover}
                        alt={item.title}
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform group-hover:scale-[1.03]"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                        No photo
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="font-semibold text-foreground">{formatPrice(item.price)}</p>
                    <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">{item.title}</p>
                    <p className="mt-2 inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      {item.area || item.city}
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
};

function FilterControls({
  category,
  area,
  sort,
  onChange,
}: {
  category: string;
  area: string;
  sort: string;
  onChange: (key: string, value: string) => void;
}) {
  return (
    <>
      <div className="space-y-1.5 md:w-48">
        <Label className="text-xs">Category</Label>
        <Select value={category} onValueChange={(v) => onChange("category", v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {CATEGORIES.map((c) => (
              <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5 md:w-56">
        <Label className="text-xs">Area</Label>
        <Select value={area} onValueChange={(v) => onChange("area", v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All islands</SelectItem>
            {ANDAMAN_AREAS.map((a) => (
              <SelectItem key={a} value={a}>{a}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5 md:w-44">
        <Label className="text-xs">Sort by</Label>
        <Select value={sort} onValueChange={(v) => onChange("sort", v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="new">Newest first</SelectItem>
            <SelectItem value="price_asc">Price: low to high</SelectItem>
            <SelectItem value="price_desc">Price: high to low</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </>
  );
}

export default Listings;