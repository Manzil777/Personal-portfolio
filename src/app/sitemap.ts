import type { MetadataRoute } from "next";
import { projects } from "@/data/site";
export default function sitemap(): MetadataRoute.Sitemap { return ["/", "/about", ...projects.map((project) => `/work/${project.slug}`)].map((path) => ({ url: `http://localhost:3000${path}`, lastModified: new Date() })); }
