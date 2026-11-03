import { z } from "zod";

export const genderSchema = z.enum(["female", "male", "unspecified"], { errorMap: () => ({ message: "Select a gender." }) });

export const registerSchema = z.object({
  displayName: z.string().trim().min(1, "Add your name.").max(40, "Use 40 characters or fewer."),
  email: z.string().trim().email("Enter a valid email address."),
  gender: genderSchema,
  password: z.string().min(8, "Use at least 8 characters.").regex(/[A-Za-z]/, "Include a letter.").regex(/[0-9]/, "Include a number."),
  confirmPassword: z.string(),
  acceptTerms: z.literal(true, { errorMap: () => ({ message: "Please accept the terms and privacy policy." }) }),
}).refine((value) => value.password === value.confirmPassword, { message: "Passwords do not match.", path: ["confirmPassword"] });

export const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password."),
});

export const resetSchema = z.object({
  password: z.string().min(8, "Use at least 8 characters.").regex(/[A-Za-z]/, "Include a letter.").regex(/[0-9]/, "Include a number."),
  confirmPassword: z.string(),
}).refine((value) => value.password === value.confirmPassword, { message: "Passwords do not match.", path: ["confirmPassword"] });

export const coupleSchema = z.object({
  name: z.string().trim().min(2, "Give your space a name.").max(60),
  nickname: z.string().trim().max(40).optional(),
});

export const memorySchema = z.object({
  title: z.string().trim().min(2).max(80),
  body: z.string().trim().max(2000).optional(),
  kind: z.enum(["milestone", "trip", "moment", "plan", "note"]),
  occurredOn: z.string().optional(),
  visibility: z.enum(["shared", "private"]),
  remindOn: z.string().optional(),
});

export const contactSchema = z.object({
  name: z.string().trim().min(1).max(80),
  email: z.string().trim().email(),
  message: z.string().trim().min(10).max(2000),
});

const journalVisibility = z.enum(["private", "partner", "public"]);
const imageRef = z.string().trim().min(1).max(400).startsWith("/api/media/");
const genreItem = z.string().trim().min(1).max(60);
export const movieSchema = z.object({
  title: z.string().trim().max(160).optional(),
  tmdbId: z.coerce.number().int().positive().nullable().optional(),
  posterUrl: z.string().trim().max(500).nullable().optional().or(z.literal("")),
  releaseYear: z.coerce.number().int().min(1888).max(2200).nullable().optional(),
  genre: z.array(genreItem).max(20).optional(),
  watchedTogether: z.boolean().optional(),
  director: z.string().trim().max(120).optional(),
  durationMinutes: z.coerce.number().int().min(1).max(1000).nullable().optional(),
  watchedDate: z.string().optional(),
  status: z.enum(["watched", "watching", "want_to_watch"]),
  rating: z.coerce.number().min(0).max(10).nullable().optional(),
  tags: z.string().max(300).optional(),
  visibility: journalVisibility,
  contentType: z.enum(["movie", "series", "season", "episode", "other"]).optional(),
  customType: z.string().trim().max(80).optional(),
  seriesId: z.string().trim().max(60).optional(),
  seasonNumber: z.coerce.number().int().min(1).max(100).nullable().optional(),
  episodeNumber: z.coerce.number().int().min(1).max(2000).nullable().optional(),
  watchedWith: z.string().trim().max(80).optional(),
  mood: z.string().trim().max(60).optional(),
  images: z.array(imageRef).max(12).optional(),
  reflection: z.string().trim().max(5000).optional(),
});

export const reflectionSchema = z.object({
  body: z.string().trim().min(2).max(5000),
  learned: z.string().trim().max(1200).optional(),
  memorableScene: z.string().trim().max(1200).optional(),
  favoriteCharacter: z.string().trim().max(300).optional(),
  lifeLesson: z.string().trim().max(1200).optional(),
  interpretation: z.string().trim().max(1600).optional(),
  imageUrls: z.array(imageRef).max(12).optional(),
  visibility: journalVisibility,
});

export const placeReflectionSchema = z.object({
  body: z.string().trim().min(2).max(5000),
  imageUrls: z.array(imageRef).max(12).optional(),
  visibility: journalVisibility,
});

export const placeSchema = z.object({
  name: z.string().trim().min(1).max(160),
  address: z.string().trim().max(300).optional(),
  latitude: z.coerce.number().min(-90).max(90).nullable().optional(),
  longitude: z.coerce.number().min(-180).max(180).nullable().optional(),
  photoUrls: z.string().max(2000).optional(),
  images: z.array(imageRef).max(12).optional(),
  visitedOn: z.string().optional(),
  notes: z.string().trim().max(2000).optional(),
  reflection: z.string().trim().max(3000).optional(),
  rating: z.coerce.number().min(0).max(10).nullable().optional(),
  category: z.enum(["nature", "restaurant", "tourist_attraction", "historical", "other"]),
  visitedTogether: z.boolean().optional(),
  visibility: journalVisibility,
});
