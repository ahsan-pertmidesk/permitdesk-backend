export const genHtmlOtp = (otp: number) => {
  return `
    <table
      role="presentation"
      border="0"
      cellpadding="0"
      cellspacing="0"
      style="margin:0; width:100%;"
    >
      <tr>
        <td align="center">
          <div
            style="
              background: #f9f5f1;
              border: 1.5px dashed #b8776b;
              color: #b8776b;
              font-size: 1.6rem;
              font-weight: 700;
              letter-spacing: 5px;
              text-align: center;
              border-radius: 12px;
              margin: 16px auto 24px auto;
              width: 90%;
              padding: 14px 0;
            "
          >
            ${otp}
          </div>
        </td>
      </tr>
    </table>
  `;
};
