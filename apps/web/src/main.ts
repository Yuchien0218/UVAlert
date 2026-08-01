import "@sunshield/ui/styles.css";
import { createApp } from "vue";
import App from "./App.vue";
import "./assets/app.css";
import { createWebAppServices } from "./app/createWebAppServices";
import { provideWebAppServices } from "./app/injection";
import { createAppRouter } from "./router";

const services = createWebAppServices();
const app = createApp(App);
const router = createAppRouter(services.boot, undefined, services.setup);

provideWebAppServices(app, services);
app.use(router);
app.mount("#app");

globalThis.addEventListener("beforeunload", services.dispose, {
  once: true
});
