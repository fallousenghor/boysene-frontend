/// <reference types="vite/client" />

declare module '*.jsx' {
  const component: React.ComponentType<any>
  export default component
}


