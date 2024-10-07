#!/bin/bash

pnpm run prisma:generate
pnpm run prisma:push
pnpm run start
