'use client';

import { AuthenticateWithRedirectCallback } from "@clerk/nextjs";

const SsoCallbackPage = () => <AuthenticateWithRedirectCallback />;

export default SsoCallbackPage;
