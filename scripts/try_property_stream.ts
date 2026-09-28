const response = await fetch(`http://localhost:${process.env.PORT ?? 3000}/property-replies`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ kind: "maintenance", propertyId: "B-204", detail: "Kitchen sink leaks under the cabinet; tenant is home after 4 pm." })
});
if (!response.ok || !response.body) throw new Error(await response.text());
for await (const chunk of response.body) process.stdout.write(new TextDecoder().decode(chunk));
