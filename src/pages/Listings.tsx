import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Loader2, MapPin, Search, SlidersHorizontal, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { usePageSeo } from "@/hooks/usePageSeo";
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
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { ANDAMAN_AREAS, CATEGORIES, ACTIVITY_FILTERS, PRICE_RANGES, formatPrice } from "@/lib/listings";
import { slang } from "@/lib/slang";
import { VerifiedLocalBadge } from "@/components/VerifiedLocalBadge";

type ListingRow = {
  id: string;
  title: string;
  price: number;
  area: string | null;
  city: string;
  category: string;
  subcategory: string | null;
  condition: string;
  created_at: string;
  listing_images: { image_url: string; display_order: number }[];
  seller: { 
    is_location_verified: boolean | null;
    name: string | null;
    successful_sales: number | null;
  } | null;
};

const PAGE_SIZE = 24;

const Listings = () => {
  const [params, setParams] = useSearchParams();
  const [items, setItems] = useState<ListingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [search, setSearch] = useState(params.get("q") ?? "");
  
  // Initialize from URL params
  const [selectedActivities, setSelectedActivities] = useState<string[]>(() => {
    const activities = params.get("activities");
    return activities ? activities.split(",").filter(Boolean) : [];
  });
  
  const { toast } = useToast();

  const category = params.get("category") ?? "all";
  const area = params.get("area") ?? "all";
  const sort = params.get("sort") ?? "new";
  const priceRange = params.get("price") ?? "all";

  // Dynamic SEO based on active filters
  const categoryLabel = CATEGORIES.find(c => c.value === category)?.label;
  const seoTitle = [
    categoryLabel ?? "All listings",
    area !== "all" ? `in ${area}` : "in Andaman Islands",
  ].join(" ");
  const seoDesc = categoryLabel
    ? `Browse ${categoryLabel.toLowerCase()} listings ${area !== "all" ? `in ${area}` : "across the Andaman Islands"}. Buy and sell locally on AndamanBazaar.`
    : `Browse all listings across the Andaman & Nicobar Islands. Buy, sell, and discover local items and experiences on AndamanBazaar.`;

  usePageSeo({
    title: seoTitle,
    description: seoDesc,
    path: "/listings",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      "name": seoTitle,
      "description": seoDesc,
      "url": "https://andamanbazaar.in/listings",
      "breadcrumb": {
        "@type": "BreadcrumbList",
        "itemListElement": [
          { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://andamanbazaar.in/" },
          { "@type": "ListItem", "position": 2, "name": "Listings", "item": "https://andamanbazaar.in/listings" },
        ]
      }
    },
  });

  // Sync activities to URL when they change — use functional setParams to avoid stale closure
  useEffect(() => {
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      if (selectedActivities.length > 0) {
        next.set("activities", selectedActivities.join(","));
      } else {
        next.delete("activities");
      }
      return next;
    }, { replace: true });
  }, [selectedActivities, setParams]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setHasMore(false);
      let q = supabase
        .from("listings")
        .select(
          "id, title, price, area, city, category, subcategory, condition, created_at, listing_images(image_url, display_order), seller:public_profiles!listings_seller_profile_fkey(is_location_verified, name, successful_sales)",
        )
        .eq("status", "active");

      if (category !== "all") q = q.eq("category", category);
      if (area !== "all") q = q.eq("area", area);
      if (params.get("q")) q = q.ilike("title", `%${params.get("q")}%`);
      
      // Price range filtering
      if (priceRange !== "all") {
        const range = PRICE_RANGES.find(r => r.value === priceRange);
        if (range) {
          q = q.gte("price", range.min);
          if (range.max) q = q.lte("price", range.max);
        }
      }

      // Activity filtering for experiences
      if (selectedActivities.length > 0 && category === "experiences") {
        const activityQuery = selectedActivities.map(a => `%${a}%`).join("|");
        q = q.or(`title.ilike.%${activityQuery}%,subcategory.in.(${selectedActivities.join(",")})`);
      }

      if (sort === "price_asc") q = q.order("price", { ascending: true });
      else if (sort === "price_desc") q = q.order("price", { ascending: false });
      else q = q.order("created_at", { ascending: false });

      const { data, error } = await q.limit(PAGE_SIZE + 1);
      if (cancelled) return;
      if (error) {
        toast({ title: "Could not load listings", description: error.message, variant: "destructive" });
        setItems([]);
      } else {
        const rows = (data as ListingRow[]) ?? [];
        setHasMore(rows.length > PAGE_SIZE);
        setItems(rows.slice(0, PAGE_SIZE));
      }
      setLoading(false);
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [category, area, sort, priceRange, selectedActivities, params, toast]);

  const loadMore = async () => {
    setLoadingMore(true);
    let q = supabase
      .from("listings")
      .select(
        "id, title, price, area, city, category, subcategory, condition, created_at, listing_images(image_url, display_order), seller:public_profiles!listings_seller_profile_fkey(is_location_verified, name, successful_sales)",
      )
      .eq("status", "active");

    if (category !== "all") q = q.eq("category", category);
    if (area !== "all") q = q.eq("area", area);
    if (params.get("q")) q = q.ilike("title", `%${params.get("q")}%`);
    
    // Price range filtering
    if (priceRange !== "all") {
      const range = PRICE_RANGES.find(r => r.value === priceRange);
      if (range) {
        q = q.gte("price", range.min);
        if (range.max) q = q.lte("price", range.max);
      }
    }

    // Activity filtering for experiences
    if (selectedActivities.length > 0 && category === "experiences") {
      const activityQuery = selectedActivities.map(a => `%${a}%`).join("|");
      q = q.or(`title.ilike.%${activityQuery}%,subcategory.in.(${selectedActivities.join(",")})`);
    }

    if (sort === "price_asc") q = q.order("price", { ascending: true });
    else if (sort === "price_desc") q = q.order("price", { ascending: false });
    else q = q.order("created_at", { ascending: false });

    const { data, error } = await q.range(items.length, items.length + PAGE_SIZE);
    if (!error && data) {
      const rows = data as ListingRow[];
      setHasMore(rows.length === PAGE_SIZE + 1);
      setItems((prev) => [...prev, ...rows.slice(0, PAGE_SIZE)]);
    }
    setLoadingMore(false);
  };

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value === "all" || !value) next.delete(key);
    else next.set(key, value);
    // Clear search query when category or area filter changes
    if (key === "category" || key === "area") {
      next.delete("q");
      setSearch("");
    }
    setParams(next);
  };

  const onSubmitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setParam("q", search.trim());
  };

  const activeFilters = useMemo(
    () => [
      category !== "all" && category, 
      area !== "all" && area,
      priceRange !== "all" && PRICE_RANGES.find(r => r.value === priceRange)?.label,
      ...selectedActivities
    ].filter(Boolean) as string[],
    [category, area, priceRange, selectedActivities],
  );

  return (
    <section className="py-4">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Browse listings</h1>
        <Link to="/sell" className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
          + Post
        </Link>
      </div>

      {/* Search bar */}
      <form onSubmit={onSubmitSearch} className="mt-3 flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search the islands…"
            className="h-11 rounded-xl pl-9 text-sm"
          />
        </div>
        {/* Mobile filter sheet */}
        <Sheet>
          <SheetTrigger asChild>
            <Button type="button" variant="outline" size="icon" className="h-11 w-11 shrink-0 rounded-xl md:hidden">
              <SlidersHorizontal className="h-4 w-4" />
              {activeFilters.length > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
                  {activeFilters.length}
                </span>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="rounded-t-3xl pb-8">
            <SheetHeader className="text-left">
              <SheetTitle>Filters</SheetTitle>
            </SheetHeader>
            <div className="mt-5 space-y-5">
              <FilterControls
                category={category} area={area} sort={sort} priceRange={priceRange}
                selectedActivities={selectedActivities}
                onSelectedActivitiesChange={setSelectedActivities}
                onChange={setParam}
              />
            </div>
          </SheetContent>
        </Sheet>
        <Button type="submit" className="hidden h-11 rounded-xl sm:inline-flex">Search</Button>
      </form>

      {/* Desktop filters */}
      <div className="mt-3 hidden flex-wrap gap-2 md:flex">
        <FilterControls
          category={category} area={area} sort={sort} priceRange={priceRange}
          selectedActivities={selectedActivities}
          onSelectedActivitiesChange={setSelectedActivities}
          onChange={setParam}
        />
      </div>

      {/* Active filter chips */}
      {activeFilters.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {activeFilters.map((f) => (
            <Badge key={f} variant="secondary" className="rounded-full capitalize">{f}</Badge>
          ))}
        </div>
      )}

      {/* Results */}
      {loading ? (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="animate-pulse rounded-2xl bg-muted" style={{ aspectRatio: "3/4" }} />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-border bg-card p-10 text-center">
          <p className="text-muted-foreground">{slang("browseEmpty", `${category}-${area}`)}</p>
          <Link to="/sell" className="mt-3 inline-block text-sm font-medium text-primary hover:underline">
            Be the first to post →
          </Link>
        </div>
      ) : (
        <>
          <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {items.map((item) => {
              const cover = [...item.listing_images]
                .sort((a, b) => a.display_order - b.display_order)[0]?.image_url;
              return (
                <li key={item.id}>
                  <Link
                    to={`/listings/${item.id}`}
                    className="group block overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-card)] transition-all hover:shadow-[var(--shadow-elevated)] active:scale-[0.98]"
                  >
                    <div className="relative aspect-square w-full overflow-hidden bg-muted">
                      {cover ? (
                        <img
                          src={cover} alt={item.title} loading="lazy"
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                          No photo
                        </div>
                      )}
                      {item.category === "experiences" && (
                        <span className="absolute left-2 top-2 rounded-full bg-primary/90 px-2 py-0.5 text-[10px] font-semibold text-primary-foreground backdrop-blur-sm">
                          Experience
                        </span>
                      )}
                    </div>
                    <div className="p-3">
                      <p className="text-sm font-semibold text-foreground">{formatPrice(item.price)}</p>
                      <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{item.title}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                          <MapPin className="h-2.5 w-2.5" />
                          {item.area || item.city}
                        </span>
                        {item.seller?.is_location_verified && <VerifiedLocalBadge />}
                        {item.category === "experiences" && item.seller?.successful_sales && item.seller.successful_sales > 0 && (
                          <span className="inline-flex items-center gap-1 text-[10px] text-amber-600">
                            <Star className="h-2.5 w-2.5 fill-current" />
                            {item.seller.successful_sales}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
          {hasMore && (
            <div className="mt-6 flex justify-center">
              <Button variant="outline" className="rounded-full px-8" onClick={loadMore} disabled={loadingMore}>
                {loadingMore ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Load more
              </Button>
            </div>
          )}
        </>
      )}
    </section>
  );
};

function FilterControls({
  category,
  area,
  sort,
  priceRange,
  selectedActivities,
  onSelectedActivitiesChange,
  onChange,
}: {
  category: string;
  area: string;
  sort: string;
  priceRange: string;
  selectedActivities: string[];
  onSelectedActivitiesChange: (activities: string[]) => void;
  onChange: (key: string, value: string) => void;
}) {
  const toggleActivity = (activity: string) => {
    if (selectedActivities.includes(activity)) {
      onSelectedActivitiesChange(selectedActivities.filter(a => a !== activity));
    } else {
      onSelectedActivitiesChange([...selectedActivities, activity]);
    }
  };

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
      
      {category === "experiences" && (
        <div className="space-y-1.5 md:w-56">
          <Label className="text-xs">Activity Type</Label>
          <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
            {ACTIVITY_FILTERS.map((activity) => (
              <label key={activity.value} className="flex items-center gap-2 text-xs">
                <Checkbox
                  checked={selectedActivities.includes(activity.value)}
                  onCheckedChange={() => toggleActivity(activity.value)}
                />
                <span>{activity.label}</span>
              </label>
            ))}
          </div>
        </div>
      )}
      
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
      
      <div className="space-y-1.5 md:w-48">
        <Label className="text-xs">Price Range</Label>
        <Select value={priceRange} onValueChange={(v) => onChange("price", v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any price</SelectItem>
            {PRICE_RANGES.map((range) => (
              <SelectItem key={range.value} value={range.value}>{range.label}</SelectItem>
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