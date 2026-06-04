export default {
  async fetch(request) {
    return Response.json({
      status: "ok",
      message: "Smart PRS Online"
    });
  }
}