import * as React from "react";
interface LogoProps {
  className?: string;
}

const Logo = (props: LogoProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={200}
    height={50}
    viewBox="0 0 220 80"
    className={props.className}
    {...props}
  >
    <text
      x={5}
      y={55}
      fontFamily="monospace"
      fontSize={48}
      fontWeight="bold"
      className="fill-current text-black dark:text-white"
    >
      {"<"}
    </text>
    <rect
      x={45}
      y={20}
      width={40}
      height={40}
      rx={8}
      ry={8}
      className="fill-current dark:fill-white fill-black"
    />
    <text
      x={55}
      y={50}
      fontFamily="monospace"
      fontSize={28}
      fontWeight="bold"
      className="fill-current dark:text-black text-white"
    >
      {"A"}
    </text>
    <rect
      x={90}
      y={20}
      width={40}
      height={40}
      rx={8}
      ry={8}
      className="fill-current dark:fill-white fill-black"
    />
    <text
      x={100}
      y={50}
      fontFamily="monospace"
      fontSize={28}
      fontWeight="bold"
      className="fill-current dark:text-black text-white"
    >
      {"C"}
    </text>
    <rect
      x={135}
      y={20}
      width={40}
      height={40}
      rx={8}
      ry={8}
      className="fill-current dark:fill-white fill-black"
    />
    <text
      x={145}
      y={50}
      fontFamily="monospace"
      fontSize={28}
      fontWeight="bold"
      className="fill-current dark:text-black text-white"
    >
      {"T"}
    </text>
    <text
      x={180}
      y={50}
      fontFamily="monospace"
      fontSize={35}
      fontWeight="bold"
      className="fill-current dark:text-white text-black"
    >
      {"/"}
    </text>
    <text
      x={200}
      y={55}
      fontFamily="monospace"
      fontSize={48}
      fontWeight="bold"
      className="fill-current dark:text-white text-black"
    >
      {">"}
    </text>
  </svg>
);
export default Logo;
