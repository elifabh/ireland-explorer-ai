import { ScrollViewStyleReset } from 'expo-router/html';

export default function Root({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover" />
        <title>Ireland Explorer</title>
        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{
          __html: `
          body { 
            background-color: #F8FAFC; 
            overflow-x: hidden;
            margin: 0 auto;
            max-width: 100vw;
          }
          #root {
            display: flex;
            flex-direction: column;
            width: 100%;
            max-width: 600px;
            margin: 0 auto;
            min-height: 100vh;
            background-color: #F8FAFC;
            box-shadow: 0 0 20px rgba(0,0,0,0.05);
          }
        `}} />
      </head>
      <body>{children}</body>
    </html>
  );
}
