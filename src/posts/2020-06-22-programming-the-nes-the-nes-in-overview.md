---
layout: post
title: "Programming the NES: The NES in overview"
summary: The first in a series of posts about programming the Nintendo Entertainment System games console, starting with a history of the system and an overview of its internals.
date: 2020-06-22
author:
  name: Steve Johns
  url: https://www.linkedin.com/in/stephen-johns-47a7568/
issueNumber: 48
---

## Introduction

This is the first in a series of posts about programming the [Nintendo Entertainment System](https://en.wikipedia.org/wiki/Nintendo_Entertainment_System) (NES) games console. Released more than 35 years ago, the NES represents a way of programming that I have no prior experience of. I have always programmed in high-level languages that largely hide the underlying CPU architecture from the developer. While NES programs can be written in C, they are normally 'hand crafted' in [assembly language](https://en.wikipedia.org/wiki/Assembly_language) to get maximum performance out of the limited hardware. And writing in assembly requires thinking about concepts like opcodes, addressing modes, registers, and the call stack. This is truly bare metal programming!

## The console

![](/images/2020-06-22-programming-the-nes-the-nes-in-overview/1280px-NES-Console-Set.jpg "The Nintendo Entertainment System (Wikipedia)")

The NES was released by Nintendo in the West in the mid 80s. It was the export version of the Famicom, Nintendo's home console that was released in Japan in 1983. Games were sold on cartridges called [Game Paks](https://en.wikipedia.org/wiki/Nintendo_Entertainment_System_Game_Pak) that plugged into the console. It came with two game controllers. Each controller was a simple affair by today's standards, with a D-pad, two action buttons (A and B), a Start button, and a Select button. The console itself had only two buttons: Power and Reset.

There was a version of the NES for the [PAL](https://en.wikipedia.org/wiki/PAL) colour television standard and another for the [NTSC](https://en.wikipedia.org/wiki/NTSC) standard. The console was a hit and lead to Nintendo developing two arcade versions of the NES: the [Nintendo VS. System](https://en.wikipedia.org/wiki/Nintendo_VS._System) and the [PlayChoice-10](https://en.wikipedia.org/wiki/PlayChoice-10). A variety of peripherals were also developed, including alternative controllers such as the [Zapper](https://en.wikipedia.org/wiki/NES_Zapper). By the mid 90s Nintendo had released the Super NES and sales of the NES had dropped. It was discontinued in 1995.

## The CPU

At the heart of the NES is a [central processing unit](https://en.wikipedia.org/wiki/Central_processing_unit) (CPU) made by Ricoh. It is based on the [MOS Technology 6502](https://en.wikipedia.org/wiki/MOS_Technology_6502), with the omission of a patented [binary coded decimal](https://en.wikipedia.org/wiki/Binary-coded_decimal) mode. The version of that CPU used in the NTSC NES was the [Ricoh 2A03](https://en.wikipedia.org/wiki/Ricoh_2A03) (a.k.a. RP2A03), and the version used in the PAL NES was the [Ricoh 2A07](https://en.wikipedia.org/wiki/Ricoh_2A03#Regional_variations) (a.k.a. RP2A07).

A CPU works by executing machine instructions, each starting with an [instruction operation code](https://en.wikipedia.org/wiki/Opcode) (opcode) that identifies the particular operation that the CPU should perform. There are 151 official opcodes. Many of them include information &mdash; an operand &mdash; that identifies the data to be operated on.

The speed at which a CPU executes instructions is determined by its clock rate, which is measured in clock cycles per second. The clock rate of the NES's CPU depends on the version of the console, being 1.66 MHz for the PAL version and 1.79 MHz for the NTSC version. Most instructions take from 2 to 7 clock cycles to execute.

Code written in the form of machine instructions is called [machine code](https://en.wikipedia.org/wiki/Machine_code). Games for the NES are usually written in assembly, a low-level programming language that closely resembles machine code but is easier to write. An [assembler](https://en.wikipedia.org/wiki/Assembly_language#Assembler) is used to convert it into machine code.

The CPU is an 8-bit CPU, meaning it has an 8-bit data bus. The data bus is the communication mechanism by which data is transferred, for example between internal RAM and the CPU, and the width of the bus is the size in bits of the individual values that it transfers. An 8-bit data bus can only transfer 8 bits &mdash; one byte &mdash; at a time, so each machine instruction can only operate on 8-bit data values. If you need to manipulate values that cannot fit inside one byte then you need to write assembly that uses multiple instructions to achieve the desired result.

The NES has only 2 KiB of internal (system) RAM, although this can be expanded via the game cartridge.

The CPU has a 16-bit address space, meaning it can address 65,536 (2<sup>16</sup>) memory locations, from `$0000` to `$FFFF`. This memory is divided up into a number of regions, not all of which are useful or even available. The system RAM is located in the first 2 KiB of the address space, from addresses `$0000` to `$07FF`. The game cartridge also includes ROM and potentially RAM, and this is made available within the address space. Besides RAM and ROM, the address space is also used to control various components, such as the graphics and audio components, and to query the status of any connected peripherals. This control is achieved by reading from and writing to particular bytes in the address space.

A useful way to refer to areas in memory is by page number. The CPU address space can be thought of as being divided into 256 pages of 256 bytes each, where the first page, also known as the zero page, begins at address `$0000`. The CPU is little endian so any addresses in the program get encoded [least significant byte](https://en.wikipedia.org/wiki/Bit_numbering#Least_significant_byte) (LSB) first and [most significant byte](https://en.wikipedia.org/wiki/Bit_numbering#Most_significant_byte) (MSB) second. For example, if I write an instruction in assembly with an operand that is the address `$1234`, the assembler will encode it as `$3412` (`$12` being the MSB and `$34` being the LSB).

The CPU includes six [processor registers](https://en.wikipedia.org/wiki/Processor_register), special data storage areas that are quick to access and that are separate from the NES's 2 KiB of system RAM. They allow data to be transferred between locations in memory, to be processed by the CPU's [arithmetic logic unit](https://en.wikipedia.org/wiki/Arithmetic_logic_unit) (ALU), and for information about the current state of the CPU to be tracked. A lot of the process of learning to program the NES in assembly is learning about the opcodes and how they affect the content of these registers. You still have access to the usual programming language constructs like loops and conditionals but now you have to understand how to code them yourself using a very different set of tools. Basically you have to do what a compiler normally does for you.

## Graphics support

Video output from the NES is handled by the [Picture Processing Unit](https://en.wikipedia.org/wiki/Picture_Processing_Unit) (PPU). It has a resolution of 256 pixels by 240 pixels, a palette of 54 colours, support for up to 64 simultaneous sprites (also called objects), and support for scrolling backgrounds.

![](/images/2020-06-22-programming-the-nes-the-nes-in-overview/castlevania.png "A screenshot from the NES game Castlevania")

The PPU has a 16 KiB address space, from `$0000` to `$3FFF`. The PPU also includes a block of 256 bytes of memory termed the [Object Attribute Memory](https://wiki.nesdev.com/w/index.php/PPU_OAM) (OAM). This memory is separate from the PPU's 16 KiB address space and is read by the PPU when rendering sprites to determine their appearance and position. Whenever we want to change the image displayed on the screen, we have to update the PPU's state. This is usually done using special addresses in the CPU address space. By writing to these addresses we can update the state of the PPU and the OAM.

The NES was created at a time when the display technology in common use was the [cathode-ray tube](https://en.wikipedia.org/wiki/Cathode-ray_tube) (CRT). This works by projecting one or more electron beams onto a fluorescent screen, scanning the beam from side to side and from top to bottom to build up an image. When the beam reaches the bottom, there is a period of time needed for the beam to return back to the top of the screen so that it can begin scanning the next frame. This time is termed the [vertical blanking interval](https://en.wikipedia.org/wiki/Vertical_blanking_interval) or vblank. During vblank the PPU is not actively rendering a frame and so it is safe to update the state of the PPU. The NTSC NES renders at 60 frames per second, while the PAL NES renders at 50 frames per second.

## Audio support

Audio is handled via the [Audio Processing Unit](https://wiki.nesdev.com/w/index.php/APU). The APU is found within the same physical chip as the CPU. It supports five audio channels: four analogue and one digital. As with the PPU, the APU is control using writes to special addresses in the CPU address space.

## The game cartridge

The game cartridge that you plug into the NES also forms a part of the overall system. The simplest game cartridge is the [NROM](https://everything2.com/title/NROM) which contains two memory chips: the Program ROM (PRG-ROM) and the Character ROM (CHR-ROM). As those names imply, both are read only. The PRG-ROM contains the program itself (as machine code) and is 16 KiB or 32 KiB in size in an NROM game cartridge. It is mapped to the CPU address space so that the CPU can execute that program code. (This mapping means that when the CPU reads a value from within that mapped part of the address space, it is actually reading a value from the game cartridge.) The CHR-ROM contains pattern table data for the background and the sprites, and is 4 KiB or 8 KiB in size in an NROM game cartridge. This data is mapped to the PPU's address space.

These size limits of the PRG-ROM and CHR-ROM are dictated by the limits of the NES hardware. They quickly became a problem after the NES was released due to developers wanting to create more complex games. The solution was the [memory management controller](https://en.wikipedia.org/wiki/Memory_management_controller) (MMC), an additional chip in the game cartridge that allows for extra program code and pattern date to be stored and accessed. The NES still has the same hardware limits but now the MMC adds control over which bytes stored on the game cartridge are mapped at any moment to the CPU and to the PPU.

There have been various designs of MMC, each with their own particular features. Some MMCs support RAM in the game cartridge. This is useful when the limited size of the system RAM or the fact that it is not persistent is a problem. The RAM can be battery-backed if persistence is required, for example to save the current game state (although a few games used [EEPROM](https://en.wikipedia.org/wiki/EEPROM) instead). Normally any RAM in the cartridge is Program RAM (PRG-RAM) and it is mapped to some area of the CPU address space. A few games use Character RAM (CHR-RAM) which is mapped to the PPU's address space and is used to work around some of the NES's display restrictions; see [here](https://wiki.nesdev.com/w/index.php/CHR_ROM_vs._CHR_RAM#CHR_RAM) for more information.

A chip that was always included in official game cartridges is the [Checking Integrated Circuit](<https://en.wikipedia.org/wiki/CIC_(Nintendo)>) (CIC), a lockout chip designed to ensure that only officially licensed games for a particular world region could be played on a given NES console.

The following image shows an opened game cartridge:

![](/images/2020-06-22-programming-the-nes-the-nes-in-overview/NES-MissionCtrlRAMCart32K1.jpg "An opened NROM-style game cartridge")

The topmost chip is the MMU. On the lower row, from left to right, are the CIC, the CHR-ROM, and the PRG-ROM chips.

## Conclusion

The NES has many limitations compared to today's game consoles and personal computers. It has a tiny amount of system RAM, a narrow data bus, a limited CPU, and an idiosyncratic PPU. Nevertheless many classic games were created for it and it continues to be a much-loved console. As you will see, programming the NES is quite the exercise in nostalgia and is a rewarding introduction to assembly and 8-bit graphics. The next post will start the journey by taking a detailed look at the 6502, the CPU used in the NES.

---

## Changelog

- 2020-06-22: Initial version
- 2020-06-23: Minor formatting changes
- 2020-06-27: Minor formatting changes
- 2020-06-28: Minor formatting changes
- 2020-08-03: Minor wording changes
