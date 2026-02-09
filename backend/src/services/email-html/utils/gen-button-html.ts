export const genHtmlButton = (url: string, buttonText: string): string => `
<table
  role="presentation"
  border="0"
  cellpadding="0"
  cellspacing="0"
  style="margin:16px 0;"
>
  <tr style= "width:200px;   ">
    <td align="center" bgcolor="#2a5d67"      style="border-radius: 1000px;     ">
      <a
        href="${url}"
        style="
          display:inline-block;
          width:200px;        
          padding:12px 0;  
          font-family:'Montserrat',sans-serif;
          font-size:16px;
          color:#ffffff;
          text-decoration:none;
          font-weight:500;
          border-radius:1000px;
          max-width:350px;
        "
      >
        ${buttonText}
      </a>
    </td>
  </tr>
</table>
`;
