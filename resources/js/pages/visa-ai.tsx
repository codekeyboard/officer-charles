import VisaAiPage from '@/pages/welcome';
import type {Props} from '@/pages/welcome';

export default function VisaAi(props: Props) {
    return <VisaAiPage {...props} />;
}

VisaAi.layout = {
    breadcrumbs: [
        {
            title: 'Visa AI',
            href: '/visa-ai',
        },
    ],
};
