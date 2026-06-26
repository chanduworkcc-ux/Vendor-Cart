import { useQuery } from "@tanstack/react-query";

const getApiBase = () => {
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  return domain ? `https://${domain}` : "";
};

export function useListProducts(
  params: { category?: string } = {},
  options: { query?: { queryKey?: any[] } } = {}
) {
  const queryKey = options?.query?.queryKey ?? ["products", params.category];
  return useQuery({
    queryKey,
    queryFn: async () => {
      const url = new URL(`${getApiBase()}/api/products`);
      if (params.category) url.searchParams.set("category", params.category);
      const res = await fetch(url.toString());
      if (!res.ok) throw new Error("Failed to fetch products");
      return res.json();
    },
    staleTime: 60_000,
  });
}

export function useListCategories() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const res = await fetch(`${getApiBase()}/api/categories`);
      if (!res.ok) throw new Error("Failed to fetch categories");
      return res.json();
    },
    staleTime: 300_000,
  });
}
