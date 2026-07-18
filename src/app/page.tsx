import dynamic from 'next/dynamic';

const JoopsGame = dynamic(() => import('./play/joops-game'), {
  ssr: false,
});

export default function Home() {
  return <JoopsGame />;
}
