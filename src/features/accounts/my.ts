import { api, el, logout, onPage, type Me } from './api';

type MyTrack = { slug: string; title: string; subtitle: string; src: string; duration: number };

const formatTime = (sec: number) => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, '0')}`;

/** Fills a TrackList-shaped list by cloning the build-time row template (keeps TrackList's styles). */
function renderTracks(root: HTMLElement, tracks: MyTrack[]) {
  const tpl = root.querySelector<HTMLTemplateElement>('[data-row-tpl]')!.content;
  const list = tpl.querySelector('ol')!.cloneNode(false) as HTMLOListElement;
  const rowTpl = tpl.querySelector('li')!;
  tracks.forEach((t, i) => {
    const li = rowTpl.cloneNode(true) as HTMLLIElement;
    li.dataset.slug = t.slug;
    const play = li.querySelector<HTMLElement>('[data-play-list]')!;
    play.dataset.playList = 'my';
    play.dataset.index = String(i);
    play.setAttribute('aria-label', `${t.title} 재생`);
    const title = li.querySelector<HTMLAnchorElement>('.tl__title')!;
    title.href = `/music/${t.slug}`;
    title.textContent = t.title;
    const sub = li.querySelector<HTMLElement>('.tl__sub')!;
    const ch = sub.querySelector('.tl__ch')!;
    ch.textContent = `CH${String(i + 1).padStart(2, '0')}`;
    sub.replaceChildren(ch, ` · ${t.subtitle}`);
    li.querySelector('.tl__dur')!.textContent = formatTime(t.duration);
    list.append(li);
  });
  const queue = el('script', { type: 'application/json', id: 'list-my' });
  queue.textContent = JSON.stringify(tracks.map(({ slug, title, subtitle, src, duration }) => ({ slug, title, subtitle, src, duration })));
  return [list, queue];
}

onPage('[data-my]', async (root) => {
  const me = await api<Me>('me');
  root.querySelector('[data-greet]')!.textContent = `${me.name}님`;
  root.querySelector<HTMLElement>('[data-logout]')!.addEventListener('click', logout);
  root.querySelector<HTMLElement>('[data-admin-link]')!.hidden = me.role !== 'admin';

  if (me.role === 'teacher') {
    root.querySelector<HTMLElement>('[data-teacher]')!.hidden = false;
  } else {
    const { tracks } = await api<{ tracks: MyTrack[] }>('my/tracks');
    const box = root.querySelector<HTMLElement>('[data-my-tracks]')!;
    const target = box.querySelector<HTMLElement>('[data-list]')!;
    target.replaceChildren(...(tracks.length ? renderTracks(root, tracks) : [el('p', { class: 'muted', text: '아직 연결된 곡이 없습니다.' })]));
    box.hidden = false;
  }
  root.hidden = false;
});
