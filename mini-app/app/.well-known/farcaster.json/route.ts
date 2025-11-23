import { title, url } from "@/lib/metadata";

export const dynamic = "force-dynamic";

export async function GET() {
  const accountAssociation = JSON.parse(
    process.env.ACCOUNT_ASSOCIATION ??
      JSON.stringify({
        header: "",
        payload: "",
        signature: "",
      })
  );
  const baseBuilder = JSON.parse(
    process.env.BASE_BUILDER ??
      JSON.stringify({
        allowedAddresses: ["0x5beFBa4634D09B7868C438f9380Dd9205a1A24Aa"],
      })
  );

  const config = {
    accountAssociation,
    baseBuilder,
    miniapp: {
      version: "1",
      name: title,
      iconUrl: `${url}/logo.png`,
      homeUrl: url,
      imageUrl: `${url}/logo.png`,
      buttonTitle: "Launch Mini App",
      splashImageUrl: `${url}/ico.png`,
      splashBackgroundColor: "#000000",
      webhookUrl: `${url}/api/webhook`,
    },
  };

  return Response.json(config);
}
