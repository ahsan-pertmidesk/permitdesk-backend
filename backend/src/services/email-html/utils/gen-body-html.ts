export const genBodyHtml = (body: string) => {
  return `<!-- Body copy -->
  <p
    style="
      margin: 0 0 16px;
      font-family: 'Montserrat', Verdana, Geneva, Tahoma, sans-serif;
      font-size: 16px;
      line-height: 1.4;
      color: #2b2b2b;
      text-align: left;
    "
  >
    ${body}
</p>`;
};
