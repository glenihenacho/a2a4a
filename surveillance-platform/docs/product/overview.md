# Product overview

## Problem

Most SMBs already own working CCTV. The cameras are fine; the *layer above*
the cameras is the problem. Vendor apps stop at "live view" and "scrub through
yesterday." Nothing is watching with intent — nothing notices that the back
door was propped for 11 minutes during a delivery, or that the same vehicle
has circled the lot four times.

Cloud-managed surveillance products solve this by making customers rip out
their hardware and adopt a vertically-integrated stack. That's a $5–20k
capex hit and a fight with whoever installed the existing system.

## What we are

A control plane that turns existing RTSP-capable cameras into **agent-observable
streams** without touching the network from the outside. We never punch a hole
through the customer's firewall. We never hold their video. We ship a small
local **connector** that sits inside their LAN, dials *out* to us, and receives
work to do (validate this URL, capture a snapshot, run this detector).

The agentic layer — anomaly detection, behavioural alerts, summarisation —
plugs into the connector once cameras are validated. The 9-step onboarding
flow in this repo is the substrate that makes everything else possible.

## Why this shape

- **No inbound connections to the customer.** Connectors poll us; we never
  poll them. This is the difference between "deployable" and "fights with IT
  for six weeks."
- **Cameras are validated where they live.** RTSP is a LAN-local protocol.
  Validating it from the cloud means hairpinning credentials and stream
  bytes across the public internet. Validating it locally means a TCP
  connect + ffmpeg snapshot inside the LAN, then a single signed JPEG
  uploaded to us.
- **Credentials never leave the connector.** The dashboard sees masked URLs
  (`rtsp://***:***@host/path`). Only the connector decrypts and uses the
  full URL.

## What we are not

- A camera vendor. We don't ship hardware.
- A VMS replacement. We don't store hours of footage; we store evidence
  clips referenced by alerts.
- A cloud anomaly detector. Detection runs in the connector or close to it,
  on the customer's network or a regional POP. The control plane orchestrates;
  it does not view.
