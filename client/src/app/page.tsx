import { redirect } from 'next/navigation';

export default function Home() {
  // Redirect to teams page instead of home
  redirect('/teams');
}
