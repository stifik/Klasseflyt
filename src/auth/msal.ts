
import { PublicClientApplication, LogLevel } from '@azure/msal-browser';

// This is a placeholder configuration. 
// You must replace placeholders with your actual Azure App Registration values.
export const msalConfig = {
  auth: {
    clientId: process.env.NEXT_PUBLIC_AZURE_AD_CLIENT_ID || 'YOUR_CLIENT_ID_PLACEHOLDER',
    authority: `https://login.microsoftonline.com/${process.env.NEXT_PUBLIC_AZURE_AD_TENANT_ID || 'YOUR_TENANT_ID_PLACEHOLDER'}`,
    redirectUri: '/', 
  },
  cache: {
    cacheLocation: 'sessionStorage',
    storeAuthStateInCookie: false,
  },
  system: {
    loggerOptions: {
      loggerCallback: (level: LogLevel, message: string, containsPii: boolean) => {
        if (containsPii) {
          return;
        }
        switch (level) {
          case LogLevel.Error:
            console.error(message);
            return;
          case LogLevel.Info:
            console.info(message);
            return;
          case LogLevel.Verbose:
            console.debug(message);
            return;
          case LogLevel.Warning:
            console.warn(message);
            return;
          default:
            return;
        }
      },
    },
  },
};

// Scopes required for the application.
// 'User.Read' is a basic scope needed for sign-in.
// 'Files.ReadWrite.AppFolder' is crucial for letting the app access its own dedicated folder in OneDrive.
export const loginRequest = {
  scopes: ['User.Read', 'Files.ReadWrite.AppFolder'],
};

export const msalInstance = new PublicClientApplication(msalConfig);
