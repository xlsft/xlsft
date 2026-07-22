<script setup lang="ts">
    import { useMediaQuery } from '@vueuse/core';
    import type { UIMessage } from 'ai'
    import { isReasoningUIPart, isTextUIPart, isToolUIPart, getToolName } from 'ai'
    import { Chat } from '@ai-sdk/vue'
    import { isReasoningStreaming, isToolStreaming } from '@nuxt/ui/utils/ai'

    const open = defineModel<boolean>('open', { default: false })

    const { t } = useI18n()
    const fullscreen = useMediaQuery('(max-width: 768px)')

    const chat = new Chat({
        onError(error) {
            console.error(error)
        }
    }), input = ref('')
</script>

<template>
    <NuxtModal v-model:open="open" :fullscreen :ui="{ content: 'sm:max-w-3xl sm:h-[28rem] p-4' }">
        <template #content>
            <NuxtChatPalette>
                <NuxtChatMessages
                    :messages="chat.messages" :status="chat.status"
                    :assistant="{ avatar: { icon: 'mage:stars-c-fill', ui: { root: 'bg-primary rounded-none *:text-white!' } } }"
                    :user="{ ui: { container: 'flex-row-reverse justify-start!' },  avatar: { icon: 'mingcute:user-2-fill', ui: { root: 'bg-border/50 rounded-none' } } }"
                >
                    <template #content="{ message }">
                        <div
                            :data-part="part.type"
                            :class="[
                                'text-sm!',
                                part.type === 'step-start' ? 'mb-0!' : '',
                                message.role === 'user' ? 'bg-primary px-2 py-1' : ''
                            ]"
                            v-for="(part, index) in message.parts"
                            :key="`${message.id}-${part.type}-${index}`"
                        >
                            <NuxtChatReasoning
                                v-if="isReasoningUIPart(part) && part.text"
                                :text="part.text"
                                :streaming="isReasoningStreaming(message, index, chat)"
                            >
                                <MDC
                                    :value="part.text"
                                    :cache-key="`reasoning-${message.id}-${index}`"
                                    class="*:first:mt-0 *:last:mb-0"
                                />
                            </NuxtChatReasoning>
                            <NuxtChatTool
                                v-else-if="isToolUIPart(part)"
                                :text="getToolName(part)"
                                :streaming="isToolStreaming(part)"
                            />
                            <MDC
                                v-else-if="isTextUIPart(part) && part.text"
                                :value="part.text"
                                :cache-key="`${message.id}-${index}`"
                                class="*:first:mt-0 *:last:mb-0"
                            />
                        </div>
                    </template>
                </NuxtChatMessages>
                <template #prompt>
                    <NuxtChatPrompt
                        :ui="{
                            root: 'px-2 border-none!'
                        }"
                        :placeholder="t('ai.placeholder')"
                        v-model="input"
                        :error="chat.error"
                        @submit="() => { chat.sendMessage({ text: input }); input = '' }"
                    >
                        <NuxtChatPromptSubmit
                            :status="chat.status"
                            @stop="chat.stop()"
                            @reload="chat.regenerate()"
                        />
                    </NuxtChatPrompt>
                </template>
            </NuxtChatPalette>
        </template>
    </NuxtModal>
</template>
