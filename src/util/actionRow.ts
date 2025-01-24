import { ActionRowBuilder, type AnyComponentBuilder } from 'discord.js';
import {
  Component,
  type AnyComponent,
  type ComponentBuilderType,
} from 'structs/Component';

export default function actionRow(
  components: (AnyComponent | ComponentBuilderType)[]
): ActionRowBuilder<ComponentBuilderType> {
  return new ActionRowBuilder<ComponentBuilderType>().addComponents(
    ...components.map((component) =>
      component instanceof Component ? component.component : component
    )
  );
}
