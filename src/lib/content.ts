import { z } from 'zod';
import siteJson from '../data/site.json';
import resultsJson from '../data/results.json';
import coursesJson from '../data/courses.json';
import teachersJson from '../data/teachers.json';

const SiteSchema = z.object({
  name: z.string(),
  address: z.string(),
  phone: z.string(),
  phoneE164: z.string(),
  hours: z.object({ weekdays: z.string(), saturday: z.string(), closed: z.string() }),
  links: z.object({ blog: z.string().url(), instagram: z.string().url(), youtube: z.string().url() }),
  showResultYears: z.boolean(),
  slogan: z.string(),
  parking: z.string().optional(),
  geo: z.object({ lat: z.number(), lng: z.number() }).optional(),
});

const ResultsSchema = z.array(
  z.object({
    school: z.string(),
    entries: z.array(z.object({ name: z.string(), major: z.string(), year: z.number().int() })),
  }),
);

const CoursesSchema = z.array(
  z.object({
    id: z.enum(['hobby', 'basic', 'complete', 'release-grad', 'release-adult']),
    name: z.string(),
    target: z.string(),
    composition: z.string(),
    role: z.string(),
  }),
);

const TeachersSchema = z.array(
  z.object({ name: z.string(), subjects: z.array(z.string()), bio: z.string(), photo: z.string().optional() }),
);

export type Site = z.infer<typeof SiteSchema>;
export type ResultSchool = z.infer<typeof ResultsSchema>[number];
export type Course = z.infer<typeof CoursesSchema>[number];
export type Teacher = z.infer<typeof TeachersSchema>[number];

const site = SiteSchema.parse(siteJson);
const results = ResultsSchema.parse(resultsJson);
const courses = CoursesSchema.parse(coursesJson);
const teachers = TeachersSchema.parse(teachersJson);

export const getSite = (): Site => site;
export const getResults = (): ResultSchool[] => results;
export const getCourses = (): Course[] => courses;
export const getTeachers = (): Teacher[] => teachers;
