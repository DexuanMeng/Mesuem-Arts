/**
 * Root Index - Redirects to scanner
 */

import { Redirect } from 'expo-router';

export default function Index() {
  return <Redirect href="/scan" />;
}
