import { createRoot } from 'react-dom/client';

import { ChatExperience } from '@/pages/welcome';
import '../css/app.css';

const root = document.getElementById('root');

if (root) {
    createRoot(root).render(<ChatExperience messages={[]} />);
}
