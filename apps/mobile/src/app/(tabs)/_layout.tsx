import { useApp } from '../../context/AppContext';
import { MainTabs } from '../../features/navigation/main-tabs';

export default function TabsLayout() {
  const { isAuthenticated } = useApp();
  return <MainTabs isSignedIn={isAuthenticated} />;
}
