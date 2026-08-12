import { formatDateTime } from '../utils.js';
import Icon from './Icon.jsx';

export default function AnnouncementCard({ announcement }) {
  return (
    <article className={`card announcement hover-lift ${announcement.pinned ? 'pinned' : ''}`}>
      <div className="a-top">
        <span className={`a-category ${announcement.category}`}>{announcement.category}</span>
        {announcement.pinned === 1 && (
          <span className="a-pin"><Icon name="pin" size={12} /> Pinned</span>
        )}
        <time className="a-date">{formatDateTime(announcement.created_at)}</time>
      </div>
      <h3>{announcement.title}</h3>
      <p>{announcement.body}</p>
    </article>
  );
}
