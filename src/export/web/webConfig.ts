import fs from 'fs';
import { select, getFrontmatter, GenericParent } from 'mystjs';
import path from 'path';
import { WebConfig } from '../../config/types';
import { ISession } from '../../session/types';
import { JupyterBookChapter, readTOC } from '../jupyter-book/toc';
import { tic } from '../utils/exec';
import { Options } from './types';
import { parseMyst, serverPath } from './utils';

export interface Page {
  title: string;
  slug?: string;
  level: number;
}

export type SiteFolder = {
  title: string;
  index: string;
  pages: Page[];
};

export interface SiteConfig {
  site: WebConfig;
  folders: Record<string, SiteFolder>;
}

export function getFileName(folder: string, file: string) {
  const filenameMd = path.join(folder, `${file}.md`);
  const filenameIpynb = path.join(folder, `${file}.ipynb`);
  const isMarkdown = fs.existsSync(filenameMd);
  const isNotebook = fs.existsSync(filenameIpynb);
  if (!isMarkdown && !isNotebook)
    throw new Error(`Could not find "${file}". See '${folder}/_toc.yml'`);
  const filename = isMarkdown ? filenameMd : filenameIpynb;
  return { filename, isMarkdown, isNotebook };
}

function getTitleFromFile(folder: string, file: string) {
  const { filename, isMarkdown } = getFileName(folder, file);
  if (isMarkdown) {
    const mdast = parseMyst(fs.readFileSync(filename).toString());
    // TODO: improve the title lookup from markdown
    const backupTitle = (select('heading', mdast) as GenericParent)?.children?.[0]?.value;
    const title = getFrontmatter(mdast)?.title || backupTitle || file;
    return title;
  }
  // TODO:
  return 'Notebook';
}

function chaptersToPages(
  folder: string,
  chapters: JupyterBookChapter[],
  pages: Page[] = [],
  level = 1,
): Page[] {
  chapters.forEach((chapter) => {
    const title = getTitleFromFile(folder, chapter.file);
    pages.push({ title, slug: chapter.file, level });
    if (chapter.sections) chaptersToPages(folder, chapter.sections, pages, level + 1);
  });
  return pages;
}

function copyLogo(session: ISession, opts: Options, logoName?: string): string | undefined {
  if (!logoName) {
    session.log.debug('No logo specified');
    return undefined;
  }
  if (!fs.existsSync(logoName))
    throw new Error(`Could not find logo at "${logoName}". See 'config.web.logo'`);
  const logo = `logo.${path.extname(logoName)}`;
  fs.copyFileSync(logoName, path.join(serverPath(opts), 'public', logo));
  return `/${logo}`;
}

function getRepeats<T>(things: T[]): Set<T> {
  const set = new Set<T>();
  const repeats = new Set<T>();
  things.forEach((thing) => {
    if (set.has(thing)) repeats.add(thing);
    set.add(thing);
  });
  return repeats;
}

function getSections(
  session: ISession,
  opts: Options,
  sections: WebConfig['sections'] = [],
): Pick<WebConfig, 'sections'> & Pick<SiteConfig, 'folders'> {
  if (sections.length === 0) {
    session.log.warn('There are no sections defined for the site.');
    return { sections: [], folders: {} };
  }
  const validated = sections.map((sec, index) => {
    if (!sec.title || !sec.folder)
      throw new Error(`Section ${index}: must have 'folder' and 'title' See 'config.web.sections'`);
    if (!fs.existsSync(sec.folder))
      throw new Error(`Could not find section "${sec.folder}". See 'config.web.sections'`);
    return { title: sec.title, folder: path.basename(sec.folder), path: sec.folder };
  });
  const repeatedBasnames = getRepeats(validated.map((s) => s.folder));
  if (repeatedBasnames.size > 0) {
    const array = [...repeatedBasnames].join('", "');
    throw new Error(`Section folder basenames must be unique. Repeated: ["${array}"].`);
  }
  const folders = Object.fromEntries(
    validated.map((sec): [string, SiteFolder] => {
      const filename = path.join(sec.path, '_toc.yml');
      if (!fs.existsSync(filename))
        throw new Error(`Could not find TOC "${filename}". Please create a '_toc.yml'.`);
      const toc = readTOC(session, { filename });
      const pages: Page[] = [];
      if (toc.chapters) {
        chaptersToPages(sec.path, toc.chapters, pages);
      } else if (toc.parts) {
        toc.parts.forEach((part, index) => {
          if (part.caption) {
            pages.push({ title: part.caption || `Part ${index + 1}`, level: 1 });
          }
          if (part.chapters) {
            chaptersToPages(sec.path, part.chapters, pages, 2);
          }
        });
      }
      return [sec.folder, { title: sec.title, index: toc.root, pages }];
    }),
  );
  return { sections: validated, folders };
}

function createConfig(session: ISession, opts: Options): SiteConfig {
  const { config } = session;
  if (!config)
    throw new Error('Could not find curvenote.yml. Use the `-C [path]` to override the default.');
  const { sections, folders } = getSections(session, opts, config.web.sections);
  return {
    site: {
      name: config.web.name,
      actions: config.web.actions ?? [],
      logo: copyLogo(session, opts, config.web.logo),
      logoText: config.web.logoText,
      sections,
    },
    folders,
  };
}

export function writeConfig(session: ISession, opts: Options, throwError = true) {
  const toc = tic();
  try {
    session.loadConfig(); // Ensure that this is the most up to date config
    const config = createConfig(session, opts);
    const pathname = path.join(serverPath(opts), 'app', 'config.json');
    session.log.info(toc(`⚙️  Writing config.json in %s`));
    fs.writeFileSync(pathname, JSON.stringify(config));
    return config;
  } catch (error) {
    if (throwError) throw error;
    session.log.error((error as Error).message);
    return null;
  }
}

export function watchConfig(session: ISession, opts: Options) {
  return fs.watchFile(session.configPath, () => writeConfig(session, opts, false));
}